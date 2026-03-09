import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { TokenValidation } from '@port-to-shelf/shared-types';

export interface GatewayConfig {
  port: number;
  authServiceUrl?: string;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  serviceRoutes: Record<string, string>;
}

export interface RequestContext {
  method: string;
  path: string;
  ip: string;
  headers: Record<string, string | undefined>;
}

export interface GatewayResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  code: string;
  timestamp: string;
  path: string;
}

export type TokenValidator = (token: string) => Promise<TokenValidation>;
export type RouteProxy = (targetBaseUrl: string, req: RequestContext) => Promise<GatewayResponse>;

const defaultConfig: GatewayConfig = {
  port: Number(process.env.PORT || 3000),
  authServiceUrl: process.env.AUTH_SERVICE_URL,
  corsOrigins: ['*'],
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 100,
  serviceRoutes: {
    '/api/v1/vessels': 'http://localhost:3001',
    '/api/v1/containers': 'http://localhost:3002',
    '/api/v1/auctions': 'http://localhost:3003',
    '/api/v1/slots': 'http://localhost:3004',
  },
};

export function createTokenValidator(authServiceUrl?: string): TokenValidator {
  if (!authServiceUrl) {
    return async () => ({ valid: false });
  }

  return async (token: string) => {
    const response = await fetch(`${authServiceUrl}/auth/validate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return { valid: false };
    }

    return response.json() as Promise<TokenValidation>;
  };
}

export function createProxy(): RouteProxy {
  return async (targetBaseUrl: string, req: RequestContext) => {
    try {
      const upstream = await fetch(`${targetBaseUrl}${req.path}`, {
        method: req.method,
        headers: req.headers as Record<string, string>,
      });
      const body = await upstream.text();
      const headers: Record<string, string> = {};
      return { status: upstream.status, headers, body };
    } catch {
      return {
        status: 502,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ error: 'Bad Gateway', message: 'Failed to reach upstream service' }),
      };
    }
  };
}

export function createGateway(config: Partial<GatewayConfig> = {}, validator?: TokenValidator, proxy?: RouteProxy) {
  const cfg: GatewayConfig = { ...defaultConfig, ...config, serviceRoutes: { ...defaultConfig.serviceRoutes, ...config.serviceRoutes } };
  const validateToken = validator || createTokenValidator(cfg.authServiceUrl);
  const proxyToService = proxy || createProxy();
  const rateState = new Map<string, { count: number; resetAt: number }>();
  const errorMetrics = new Map<string, number>();

  const logError = (error: ErrorResponse): void => {
    const key = `${error.code}:${error.path}`;
    errorMetrics.set(key, (errorMetrics.get(key) ?? 0) + 1);
    console.error(JSON.stringify({ level: 'error', ...error }));
  };

  const makeErrorResponse = (
    status: number,
    req: RequestContext,
    baseHeaders: Record<string, string>,
    error: string,
    message: string,
    code: string
  ): GatewayResponse => {
    const body: ErrorResponse = {
      error,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: req.path,
    };
    logError(body);
    return {
      status,
      headers: { ...baseHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
  };

  return {
    getErrorMetrics(): Record<string, number> {
      return Object.fromEntries(errorMetrics.entries());
    },

    async handle(req: RequestContext): Promise<GatewayResponse> {
      const origin = req.headers.origin;
      const corsOrigin = cfg.corsOrigins.includes('*')
        ? '*'
        : origin && cfg.corsOrigins.includes(origin)
          ? origin
          : cfg.corsOrigins[0];

      const baseHeaders: Record<string, string> = {
        'access-control-allow-origin': corsOrigin || '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'Content-Type,Authorization',
      };

      if (req.method === 'OPTIONS') {
        return { status: 204, headers: baseHeaders, body: '' };
      }

      const now = Date.now();
      const rate = rateState.get(req.ip);
      if (!rate || now > rate.resetAt) {
        rateState.set(req.ip, { count: 1, resetAt: now + cfg.rateLimitWindowMs });
      } else if (rate.count >= cfg.rateLimitMaxRequests) {
        return makeErrorResponse(429, req, baseHeaders, 'Too Many Requests', 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
      } else {
        rate.count += 1;
      }

      if (req.path === '/health') {
        return {
          status: 200,
          headers: { ...baseHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'ok', service: 'api-gateway' }),
        };
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return makeErrorResponse(401, req, baseHeaders, 'Unauthorized', 'Missing or invalid authorization header', 'AUTH_HEADER_INVALID');
      }

      const token = authHeader.slice('Bearer '.length).trim();
      const auth = await validateToken(token);
      if (!auth.valid) {
        return makeErrorResponse(401, req, baseHeaders, 'Unauthorized', 'Invalid token', 'TOKEN_INVALID');
      }

      const route = Object.entries(cfg.serviceRoutes).find(([prefix]) => req.path.startsWith(prefix));
      if (!route) {
        return makeErrorResponse(404, req, baseHeaders, 'Not Found', 'No route configured for request path', 'ROUTE_NOT_FOUND');
      }

      const [prefix, target] = route;
      const downstreamPath = req.path.slice(prefix.length) || '/';
      const proxied = await proxyToService(target, { ...req, path: downstreamPath });
      return { ...proxied, headers: { ...baseHeaders, ...proxied.headers } };
    },
  };
}

export function startServer(config: Partial<GatewayConfig> = {}): void {
  const gateway = createGateway(config);
  const port = config.port || defaultConfig.port;

  createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const response = await gateway.handle({
      method: req.method || 'GET',
      path: url.pathname,
      ip: req.socket.remoteAddress || 'unknown',
      headers: {
        authorization: req.headers.authorization,
        origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
      },
    });

    res.statusCode = response.status;
    Object.entries(response.headers).forEach(([k, v]) => res.setHeader(k, v));
    res.end(response.body);
  }).listen(port, () => {
    console.log(`API Gateway listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer();
}
