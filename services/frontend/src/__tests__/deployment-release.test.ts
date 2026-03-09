import { evaluateQualityGates, evaluateSyntheticChecks } from '../deployment/ci-gates';
import { validateEnvironmentReadiness } from '../deployment/environment-readiness';
import { validateReleaseMetadata } from '../deployment/release-policy';

describe('frontend deployment and release management', () => {
  it('validates release metadata policy', () => {
    const valid = validateReleaseMetadata({
      version: '1.2.3',
      commitSha: 'a1b2c3d4',
      buildTimestampIso: '2026-03-09T12:00:00Z',
      sourceMapUploadId: 'sourcemap-123',
    });

    const invalid = validateReleaseMetadata({
      version: 'latest',
      commitSha: 'XYZ',
      buildTimestampIso: 'invalid-date',
      sourceMapUploadId: ' ',
    });

    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
    expect(invalid.issues.length).toBeGreaterThan(0);
  });

  it('validates runtime environment readiness for staging/prod', () => {
    const staging = validateEnvironmentReadiness({
      environmentName: 'staging',
      apiBaseUrl: 'https://staging-api.example.com',
      authIssuer: 'https://auth.example.com',
      featureFlagEndpoint: 'https://flags.example.com',
    });

    const broken = validateEnvironmentReadiness({
      environmentName: 'prod',
      apiBaseUrl: 'http://prod-api.example.com',
      authIssuer: '',
      featureFlagEndpoint: 'http://flags.example.com',
    });

    expect(staging.ready).toBe(true);
    expect(broken.ready).toBe(false);
    expect(broken.issues).toContain('authIssuer is required');
  });

  it('evaluates CI quality gates and synthetic post-deploy checks', () => {
    const gates = evaluateQualityGates({
      lintPassed: true,
      typecheckPassed: true,
      unitPassed: true,
      integrationPassed: true,
      buildPassed: true,
      smokePassed: false,
      perfBudgetPassed: true,
    });

    const synthetic = evaluateSyntheticChecks([
      { name: 'tracking-page', ok: true },
      { name: 'auction-page', ok: false },
    ]);

    expect(gates.releasable).toBe(false);
    expect(gates.failedChecks).toContain('smokePassed');
    expect(synthetic.failedChecks).toContain('auction-page');
  });
});
