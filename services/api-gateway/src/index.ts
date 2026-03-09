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
  responseCacheTtlMs: number;
  maxTrackedLatencySamples: number;
  errorRateAlertThreshold: number;
  latencyAlertThresholdMs: number;
  integrationHealthAlertThreshold: number;
}

export interface RequestContext {
  method: string;
  path: string;
  ip: string;
  headers: Record<string, string | undefined>;
  query?: Record<string, string>;
  body?: string;
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

export interface StructuredLogEntry {
  level: 'info' | 'warn' | 'error';
  event: string;
  timestamp: string;
  path?: string;
  method?: string;
  status?: number;
  code?: string;
  message?: string;
  durationMs?: number;
  ip?: string;
  target?: string;
  details?: Record<string, unknown>;
}

export interface GatewayLogger {
  log(entry: StructuredLogEntry): void;
}

export interface RequestLatencyStats {
  requestCount: number;
  averageMs: number;
  p95Ms: number;
}

export interface AlertEvent {
  id: string;
  type: 'HIGH_ERROR_RATE' | 'HIGH_P95_LATENCY' | 'INTEGRATION_HEALTH_DEGRADED';
  severity: 'warning' | 'critical';
  message: string;
  route?: string;
  target?: string;
  timestamp: string;
  observedValue: number;
  threshold: number;
}

export interface GatewayPerformanceStats {
  global: RequestLatencyStats;
  byRoute: Record<string, RequestLatencyStats>;
  cache: {
    hits: number;
    misses: number;
    entries: number;
  };
  routeErrorRates: Record<string, { total: number; errors: number; errorRate: number }>;
  integrationHealth: Record<string, { success: number; failure: number; successRate: number }>;
  alerts: AlertEvent[];
}

export interface LocalApiHandlers {
  registerVessel?(body: unknown): Promise<unknown>;
  updateVesselPosition?(id: string, body: unknown): Promise<unknown>;
  getVessel?(id: string): Promise<unknown>;
  listVessels?(): Promise<unknown>;
  recordVesselArrival?(id: string, body: unknown): Promise<unknown>;

  createContainer?(body: unknown): Promise<unknown>;
  updateContainerTransportMode?(id: string, body: unknown): Promise<unknown>;
  getContainerJourney?(id: string): Promise<unknown>;
  queryContainers?(query?: Record<string, string>): Promise<unknown>;
  markContainerDelivered?(id: string, body: unknown): Promise<unknown>;

  listAuctions?(): Promise<unknown>;
  getAuction?(id: string): Promise<unknown>;
  submitAuctionBid?(auctionId: string, body: unknown): Promise<unknown>;

  getPerformanceMetrics?(): Promise<unknown>;
  getReports?(): Promise<unknown>;
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
  responseCacheTtlMs: 5_000,
  maxTrackedLatencySamples: 1_000,
  errorRateAlertThreshold: 0.2,
  latencyAlertThresholdMs: 500,
  integrationHealthAlertThreshold: 0.9,
};

const defaultLogger: GatewayLogger = {
  log(entry: StructuredLogEntry): void {
    const writer = entry.level === 'error' ? console.error : console.log;
    writer(JSON.stringify(entry));
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
        body: req.body,
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

function parseBody(req: RequestContext): unknown {
  if (!req.body) return {};
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

function jsonResponse(status: number, baseHeaders: Record<string, string>, body: unknown): GatewayResponse {
  return {
    status,
    headers: { ...baseHeaders, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export function createGateway(
  config: Partial<GatewayConfig> = {},
  validator?: TokenValidator,
  proxy?: RouteProxy,
  handlers: LocalApiHandlers = {},
  logger: GatewayLogger = defaultLogger
) {
  const cfg: GatewayConfig = { ...defaultConfig, ...config, serviceRoutes: { ...defaultConfig.serviceRoutes, ...config.serviceRoutes } };
  const validateToken = validator || createTokenValidator(cfg.authServiceUrl);
  const proxyToService = proxy || createProxy();
  const rateState = new Map<string, { count: number; resetAt: number }>();
  const errorMetrics = new Map<string, number>();
  const requestLatencies = new Map<string, number[]>();
  const responseCache = new Map<string, { expiresAt: number; response: GatewayResponse }>();
  const routeStats = new Map<string, { total: number; errors: number }>();
  const integrationStats = new Map<string, { success: number; failure: number }>();
  const alerts: AlertEvent[] = [];
  const alertCooldown = new Map<string, number>();
  let cacheHits = 0;
  let cacheMisses = 0;

  const pushLog = (entry: Omit<StructuredLogEntry, 'timestamp'>): void => {
    logger.log({ ...entry, timestamp: new Date().toISOString() });
  };

  const emitAlert = (alert: Omit<AlertEvent, 'id' | 'timestamp'>): void => {
    const key = `${alert.type}:${alert.route || alert.target || 'global'}`;
    const now = Date.now();
    const last = alertCooldown.get(key) ?? 0;
    if (now - last < 60_000) {
      return;
    }

    const record: AlertEvent = {
      id: `${key}:${now}`,
      timestamp: new Date().toISOString(),
      ...alert,
    };

    alertCooldown.set(key, now);
    alerts.push(record);
    if (alerts.length > 200) alerts.shift();

    pushLog({
      level: alert.severity === 'critical' ? 'error' : 'warn',
      event: 'gateway.alert.triggered',
      message: record.message,
      details: {
        type: record.type,
        threshold: record.threshold,
        observedValue: record.observedValue,
        route: record.route,
        target: record.target,
      },
    });
  };

  const trackRouteStats = (routeKey: string, status: number): void => {
    const current = routeStats.get(routeKey) ?? { total: 0, errors: 0 };
    current.total += 1;
    if (status >= 500) current.errors += 1;
    routeStats.set(routeKey, current);

    const errorRate = current.total === 0 ? 0 : current.errors / current.total;
    if (current.total >= 10 && errorRate >= cfg.errorRateAlertThreshold) {
      emitAlert({
        type: 'HIGH_ERROR_RATE',
        severity: 'critical',
        message: `High error rate detected for ${routeKey}`,
        route: routeKey,
        observedValue: Number(errorRate.toFixed(4)),
        threshold: cfg.errorRateAlertThreshold,
      });
    }
  };

  const trackIntegrationStats = (target: string, status: number): void => {
    const current = integrationStats.get(target) ?? { success: 0, failure: 0 };
    if (status >= 500) {
      current.failure += 1;
    } else {
      current.success += 1;
    }
    integrationStats.set(target, current);

    const total = current.success + current.failure;
    const successRate = total === 0 ? 1 : current.success / total;
    if (total >= 5 && successRate < cfg.integrationHealthAlertThreshold) {
      emitAlert({
        type: 'INTEGRATION_HEALTH_DEGRADED',
        severity: 'warning',
        message: `Integration health degraded for target ${target}`,
        target,
        observedValue: Number(successRate.toFixed(4)),
        threshold: cfg.integrationHealthAlertThreshold,
      });
    }
  };

  const trackLatency = (routeKey: string, elapsedMs: number): void => {
    const all = requestLatencies.get('__all__') ?? [];
    all.push(elapsedMs);
    if (all.length > cfg.maxTrackedLatencySamples) all.shift();
    requestLatencies.set('__all__', all);

    const route = requestLatencies.get(routeKey) ?? [];
    route.push(elapsedMs);
    if (route.length > cfg.maxTrackedLatencySamples) route.shift();
    requestLatencies.set(routeKey, route);

    const routeStatsLatency = summarizeLatency(route);
    if (routeStatsLatency.requestCount >= 10 && routeStatsLatency.p95Ms > cfg.latencyAlertThresholdMs) {
      emitAlert({
        type: 'HIGH_P95_LATENCY',
        severity: 'warning',
        message: `High p95 latency detected for ${routeKey}`,
        route: routeKey,
        observedValue: routeStatsLatency.p95Ms,
        threshold: cfg.latencyAlertThresholdMs,
      });
    }
  };

  const summarizeLatency = (samples: number[]): RequestLatencyStats => {
    if (samples.length === 0) {
      return { requestCount: 0, averageMs: 0, p95Ms: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
    const averageMs = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;

    return {
      requestCount: sorted.length,
      averageMs: Number(averageMs.toFixed(2)),
      p95Ms: Number(sorted[p95Index].toFixed(2)),
    };
  };

  const buildCacheKey = (req: RequestContext): string | undefined => {
    if (req.method !== 'GET') return undefined;
    const cacheablePaths = ['/api/v1/metrics/performance', '/api/v1/reports'];
    const isCacheable = cacheablePaths.includes(req.path);
    if (!isCacheable) return undefined;

    const query = req.query ? JSON.stringify(Object.entries(req.query).sort(([a], [b]) => a.localeCompare(b))) : '';
    return `${req.method}:${req.path}:${query}`;
  };

  const getCachedResponse = (cacheKey: string): GatewayResponse | undefined => {
    const entry = responseCache.get(cacheKey);
    if (!entry) {
      cacheMisses += 1;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      responseCache.delete(cacheKey);
      cacheMisses += 1;
      return undefined;
    }

    cacheHits += 1;
    return { ...entry.response, headers: { ...entry.response.headers, 'x-cache': 'HIT' } };
  };

  const maybeSetCachedResponse = (cacheKey: string | undefined, response: GatewayResponse): void => {
    if (!cacheKey || response.status >= 400) return;

    responseCache.set(cacheKey, {
      expiresAt: Date.now() + cfg.responseCacheTtlMs,
      response: { ...response, headers: { ...response.headers, 'x-cache': 'MISS' } },
    });
  };

  const logError = (error: ErrorResponse, req: RequestContext): void => {
    const key = `${error.code}:${error.path}`;
    errorMetrics.set(key, (errorMetrics.get(key) ?? 0) + 1);

    pushLog({
      level: 'error',
      event: 'gateway.request.error',
      path: error.path,
      method: req.method,
      code: error.code,
      message: error.message,
      ip: req.ip,
      details: { error: error.error },
    });

    if (error.code.startsWith('AUTH_') || error.code === 'TOKEN_INVALID') {
      pushLog({
        level: 'warn',
        event: 'gateway.security.authentication_failed',
        path: error.path,
        method: req.method,
        code: error.code,
        message: error.message,
        ip: req.ip,
      });
    }
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
    logError(body, req);
    return {
      status,
      headers: { ...baseHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
  };

  const handleLocalEndpoint = async (
    req: RequestContext,
    baseHeaders: Record<string, string>
  ): Promise<GatewayResponse | undefined> => {
    const body = parseBody(req);

    const vesselIdMatch = req.path.match(/^\/api\/v1\/vessels\/([^/]+)$/);
    const vesselPositionMatch = req.path.match(/^\/api\/v1\/vessels\/([^/]+)\/position$/);
    const vesselArrivalMatch = req.path.match(/^\/api\/v1\/vessels\/([^/]+)\/arrival$/);
    const containerJourneyMatch = req.path.match(/^\/api\/v1\/containers\/([^/]+)\/journey$/);
    const containerModeMatch = req.path.match(/^\/api\/v1\/containers\/([^/]+)\/transport-mode$/);
    const containerDeliveredMatch = req.path.match(/^\/api\/v1\/containers\/([^/]+)\/delivered$/);
    const auctionMatch = req.path.match(/^\/api\/v1\/auctions\/([^/]+)$/);
    const auctionBidMatch = req.path.match(/^\/api\/v1\/auctions\/([^/]+)\/bids$/);

    if (req.method === 'POST' && req.path === '/api/v1/vessels' && handlers.registerVessel) {
      return jsonResponse(201, baseHeaders, await handlers.registerVessel(body));
    }

    if (req.method === 'PUT' && vesselPositionMatch && handlers.updateVesselPosition) {
      return jsonResponse(200, baseHeaders, await handlers.updateVesselPosition(vesselPositionMatch[1], body));
    }

    if (req.method === 'GET' && vesselIdMatch && handlers.getVessel) {
      return jsonResponse(200, baseHeaders, await handlers.getVessel(vesselIdMatch[1]));
    }

    if (req.method === 'GET' && req.path === '/api/v1/vessels' && handlers.listVessels) {
      return jsonResponse(200, baseHeaders, await handlers.listVessels());
    }

    if (req.method === 'POST' && vesselArrivalMatch && handlers.recordVesselArrival) {
      return jsonResponse(200, baseHeaders, await handlers.recordVesselArrival(vesselArrivalMatch[1], body));
    }

    if (req.method === 'POST' && req.path === '/api/v1/containers' && handlers.createContainer) {
      return jsonResponse(201, baseHeaders, await handlers.createContainer(body));
    }

    if (req.method === 'PUT' && containerModeMatch && handlers.updateContainerTransportMode) {
      return jsonResponse(200, baseHeaders, await handlers.updateContainerTransportMode(containerModeMatch[1], body));
    }

    if (req.method === 'GET' && containerJourneyMatch && handlers.getContainerJourney) {
      return jsonResponse(200, baseHeaders, await handlers.getContainerJourney(containerJourneyMatch[1]));
    }

    if (req.method === 'GET' && req.path === '/api/v1/containers' && handlers.queryContainers) {
      return jsonResponse(200, baseHeaders, await handlers.queryContainers(req.query));
    }

    if (req.method === 'POST' && containerDeliveredMatch && handlers.markContainerDelivered) {
      return jsonResponse(200, baseHeaders, await handlers.markContainerDelivered(containerDeliveredMatch[1], body));
    }

    if (req.method === 'GET' && req.path === '/api/v1/auctions' && handlers.listAuctions) {
      return jsonResponse(200, baseHeaders, await handlers.listAuctions());
    }

    if (req.method === 'GET' && auctionMatch && handlers.getAuction) {
      return jsonResponse(200, baseHeaders, await handlers.getAuction(auctionMatch[1]));
    }

    if (req.method === 'POST' && auctionBidMatch && handlers.submitAuctionBid) {
      return jsonResponse(201, baseHeaders, await handlers.submitAuctionBid(auctionBidMatch[1], body));
    }

    if (req.method === 'GET' && req.path === '/api/v1/metrics/performance' && handlers.getPerformanceMetrics) {
      return jsonResponse(200, baseHeaders, await handlers.getPerformanceMetrics());
    }

    if (req.method === 'GET' && req.path === '/api/v1/reports' && handlers.getReports) {
      return jsonResponse(200, baseHeaders, await handlers.getReports());
    }

    return undefined;
  };

  return {
    getErrorMetrics(): Record<string, number> {
      return Object.fromEntries(errorMetrics.entries());
    },

    getPerformanceStats(): GatewayPerformanceStats {
      const byRouteEntries = [...requestLatencies.entries()]
        .filter(([key]) => key !== '__all__')
        .map(([key, values]) => [key, summarizeLatency(values)] as const);

      const routeErrorRates = Object.fromEntries(
        [...routeStats.entries()].map(([key, value]) => [key, {
          total: value.total,
          errors: value.errors,
          errorRate: value.total === 0 ? 0 : Number((value.errors / value.total).toFixed(4)),
        }])
      );

      const integrationHealth = Object.fromEntries(
        [...integrationStats.entries()].map(([key, value]) => {
          const total = value.success + value.failure;
          return [key, {
            success: value.success,
            failure: value.failure,
            successRate: total === 0 ? 1 : Number((value.success / total).toFixed(4)),
          }];
        })
      );

      return {
        global: summarizeLatency(requestLatencies.get('__all__') ?? []),
        byRoute: Object.fromEntries(byRouteEntries),
        cache: {
          hits: cacheHits,
          misses: cacheMisses,
          entries: responseCache.size,
        },
        routeErrorRates,
        integrationHealth,
        alerts: [...alerts],
      };
    },

    async handle(req: RequestContext): Promise<GatewayResponse> {
      const startedAt = Date.now();
      const routeKey = `${req.method} ${req.path}`;
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
        const response = makeErrorResponse(429, req, baseHeaders, 'Too Many Requests', 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED');
        trackRouteStats(routeKey, response.status);
        return response;
      } else {
        rate.count += 1;
      }

      if (req.path === '/health') {
        const response = {
          status: 200,
          headers: { ...baseHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ status: 'ok', service: 'api-gateway' }),
        };
        trackLatency(routeKey, Date.now() - startedAt);
        trackRouteStats(routeKey, response.status);
        return response;
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const response = makeErrorResponse(401, req, baseHeaders, 'Unauthorized', 'Missing or invalid authorization header', 'AUTH_HEADER_INVALID');
        trackRouteStats(routeKey, response.status);
        return response;
      }

      const token = authHeader.slice('Bearer '.length).trim();
      const auth = await validateToken(token);
      if (!auth.valid) {
        const response = makeErrorResponse(401, req, baseHeaders, 'Unauthorized', 'Invalid token', 'TOKEN_INVALID');
        trackRouteStats(routeKey, response.status);
        return response;
      }

      const cacheKey = buildCacheKey(req);
      if (cacheKey) {
        const cached = getCachedResponse(cacheKey);
        if (cached) {
          const response = { ...cached, headers: { ...baseHeaders, ...cached.headers } };
          const duration = Date.now() - startedAt;
          trackLatency(routeKey, duration);
          trackRouteStats(routeKey, response.status);
          pushLog({ level: 'info', event: 'gateway.request.completed', path: req.path, method: req.method, status: response.status, durationMs: duration, ip: req.ip, details: { cache: 'HIT' } });
          return response;
        }
      }

      const local = await handleLocalEndpoint(req, baseHeaders);
      if (local) {
        maybeSetCachedResponse(cacheKey, local);
        const duration = Date.now() - startedAt;
        trackLatency(routeKey, duration);
        trackRouteStats(routeKey, local.status);
        pushLog({ level: 'info', event: 'gateway.request.completed', path: req.path, method: req.method, status: local.status, durationMs: duration, ip: req.ip });
        return local;
      }

      const route = Object.entries(cfg.serviceRoutes).find(([prefix]) => req.path.startsWith(prefix));
      if (!route) {
        const response = makeErrorResponse(404, req, baseHeaders, 'Not Found', 'No route configured for request path', 'ROUTE_NOT_FOUND');
        trackRouteStats(routeKey, response.status);
        return response;
      }

      const [prefix, target] = route;
      const downstreamPath = req.path.slice(prefix.length) || '/';
      const proxied = await proxyToService(target, { ...req, path: downstreamPath });
      const merged = { ...proxied, headers: { ...baseHeaders, ...proxied.headers } };
      maybeSetCachedResponse(cacheKey, merged);
      const duration = Date.now() - startedAt;
      trackLatency(routeKey, duration);
      trackRouteStats(routeKey, merged.status);
      trackIntegrationStats(target, merged.status);
      pushLog({ level: merged.status >= 500 ? 'error' : 'info', event: 'gateway.request.completed', path: req.path, method: req.method, status: merged.status, durationMs: duration, ip: req.ip, target });
      return merged;
    },
  };
}

export function startServer(config: Partial<GatewayConfig> = {}): void {
  const gateway = createGateway(config);
  const port = config.port || defaultConfig.port;

  createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const body = await new Promise<string>((resolve) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });

    const response = await gateway.handle({
      method: req.method || 'GET',
      path: url.pathname,
      ip: req.socket.remoteAddress || 'unknown',
      query: Object.fromEntries(url.searchParams.entries()),
      body,
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
