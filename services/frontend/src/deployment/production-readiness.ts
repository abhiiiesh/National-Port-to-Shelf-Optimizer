import type { FrontendHealthSnapshot } from '../observability/alerts';
import { defaultFrontendSloThresholds } from '../observability/alerts';
import type { FrontendQualityGateResult } from './ci-gates';

export interface FrontendExitCriteriaInput {
  qualityGates: FrontendQualityGateResult;
  strictBuildPassed: boolean;
  roleTenantVerificationPassed: boolean;
  accessibilityBaselinePassed: boolean;
  healthSnapshot: FrontendHealthSnapshot;
  deploymentArtifactsImmutable: boolean;
}

export interface FrontendExitCriteriaResult {
  productionReady: boolean;
  checklist: Array<{ criterion: string; passed: boolean }>;
}

export const evaluateFrontendExitCriteria = (
  input: FrontendExitCriteriaInput
): FrontendExitCriteriaResult => {
  const checklist = [
    {
      criterion: 'Mandatory frontend checks pass in CI',
      passed: input.qualityGates.releasable,
    },
    {
      criterion: 'Strict build is green without developer overrides',
      passed: input.strictBuildPassed,
    },
    {
      criterion: 'Role-based access and tenant isolation are verified',
      passed: input.roleTenantVerificationPassed,
    },
    {
      criterion: 'Accessibility baseline is satisfied',
      passed: input.accessibilityBaselinePassed,
    },
    {
      criterion: 'Frontend error/latency thresholds are within SLO',
      passed:
        input.healthSnapshot.errorRatePercent <
          defaultFrontendSloThresholds.errorRatePercentWarning &&
        input.healthSnapshot.p95InteractionMs <
          defaultFrontendSloThresholds.p95InteractionMsWarning,
    },
    {
      criterion: 'Deployment artifacts are immutable and smoke-validated',
      passed: input.deploymentArtifactsImmutable,
    },
  ];

  return {
    productionReady: checklist.every((entry) => entry.passed),
    checklist,
  };
};
