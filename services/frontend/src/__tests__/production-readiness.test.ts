import { evaluateQualityGates } from '../deployment/ci-gates';
import { evaluateFrontendExitCriteria } from '../deployment/production-readiness';

describe('frontend sprint sequencing and production-ready exit criteria', () => {
  it('satisfies all exit criteria for a release-ready frontend candidate', () => {
    const qualityGates = evaluateQualityGates({
      lintPassed: true,
      typecheckPassed: true,
      unitPassed: true,
      integrationPassed: true,
      buildPassed: true,
      smokePassed: true,
      perfBudgetPassed: true,
    });

    const result = evaluateFrontendExitCriteria({
      qualityGates,
      strictBuildPassed: true,
      roleTenantVerificationPassed: true,
      accessibilityBaselinePassed: true,
      healthSnapshot: {
        errorRatePercent: 1.2,
        p95InteractionMs: 250,
      },
      deploymentArtifactsImmutable: true,
    });

    expect(result.productionReady).toBe(true);
    expect(result.checklist.every((entry) => entry.passed)).toBe(true);
  });

  it('fails production readiness when critical criteria are not met', () => {
    const qualityGates = evaluateQualityGates({
      lintPassed: true,
      typecheckPassed: true,
      unitPassed: true,
      integrationPassed: false,
      buildPassed: true,
      smokePassed: false,
      perfBudgetPassed: true,
    });

    const result = evaluateFrontendExitCriteria({
      qualityGates,
      strictBuildPassed: true,
      roleTenantVerificationPassed: false,
      accessibilityBaselinePassed: false,
      healthSnapshot: {
        errorRatePercent: 6.5,
        p95InteractionMs: 950,
      },
      deploymentArtifactsImmutable: false,
    });

    expect(result.productionReady).toBe(false);
    expect(result.checklist.some((entry) => !entry.passed)).toBe(true);
  });
});
