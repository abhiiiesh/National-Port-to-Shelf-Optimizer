export interface FrontendEnvironment {
  apiGatewayBaseUrl: string;
  apiContractVersion: string;
}

const defaultBaseUrl = 'http://localhost:3000';

export const getFrontendEnvironment = (): FrontendEnvironment => ({
  apiGatewayBaseUrl: process.env.FRONTEND_API_BASE_URL ?? defaultBaseUrl,
  apiContractVersion: process.env.FRONTEND_API_CONTRACT_VERSION ?? 'v1',
});
