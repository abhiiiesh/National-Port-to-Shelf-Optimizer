export interface FrontendRuntimeEnvironment {
  environmentName: 'dev' | 'staging' | 'prod';
  apiBaseUrl: string;
  authIssuer: string;
  featureFlagEndpoint: string;
}

export interface ReadinessCheckResult {
  ready: boolean;
  issues: string[];
}

const isHttpsUrl = (value: string): boolean => /^https:\/\//.test(value);

export const validateEnvironmentReadiness = (
  runtime: FrontendRuntimeEnvironment
): ReadinessCheckResult => {
  const issues: string[] = [];

  if (!runtime.apiBaseUrl) {
    issues.push('apiBaseUrl is required');
  }

  if (!runtime.authIssuer) {
    issues.push('authIssuer is required');
  }

  if (!runtime.featureFlagEndpoint) {
    issues.push('featureFlagEndpoint is required');
  }

  if (runtime.environmentName !== 'dev') {
    if (!isHttpsUrl(runtime.apiBaseUrl)) {
      issues.push('apiBaseUrl must use https outside dev');
    }

    if (!isHttpsUrl(runtime.authIssuer)) {
      issues.push('authIssuer must use https outside dev');
    }

    if (!isHttpsUrl(runtime.featureFlagEndpoint)) {
      issues.push('featureFlagEndpoint must use https outside dev');
    }
  }

  return {
    ready: issues.length === 0,
    issues,
  };
};
