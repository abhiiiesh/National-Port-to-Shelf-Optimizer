export interface FrontendQualityGateInput {
  lintPassed: boolean;
  typecheckPassed: boolean;
  unitPassed: boolean;
  integrationPassed: boolean;
  buildPassed: boolean;
  smokePassed: boolean;
  perfBudgetPassed: boolean;
}

export interface FrontendQualityGateResult {
  releasable: boolean;
  failedChecks: string[];
}

export const evaluateQualityGates = (
  input: FrontendQualityGateInput
): FrontendQualityGateResult => {
  const failedChecks = Object.entries(input)
    .filter(([, passed]) => !passed)
    .map(([name]) => name);

  return {
    releasable: failedChecks.length === 0,
    failedChecks,
  };
};

export interface SyntheticCheck {
  name: string;
  ok: boolean;
}

export const evaluateSyntheticChecks = (checks: SyntheticCheck[]): FrontendQualityGateResult => {
  const failedChecks = checks.filter((check) => !check.ok).map((check) => check.name);

  return {
    releasable: failedChecks.length === 0,
    failedChecks,
  };
};
