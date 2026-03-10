import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { Role } from '@port-to-shelf/shared-types';
import { AuthService } from './services/auth.service';

export interface AuthenticationServiceConfig {
  port: number;
}

const defaultConfig: AuthenticationServiceConfig = {
  port: Number(process.env.AUTH_SERVICE_PORT || process.env.PORT || 3005),
};

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? (JSON.parse(raw) as unknown) : {};
}

function mapRole(rawRole: unknown): Role {
  if (typeof rawRole !== 'string') {
    return Role.RETAILER;
  }

  if (Object.values(Role).includes(rawRole as Role)) {
    return rawRole as Role;
  }

  return Role.RETAILER;
}

export function createAuthenticationServer(
  config: Partial<AuthenticationServiceConfig> = {},
  service = new AuthService()
) {
  const cfg = { ...defaultConfig, ...config };

  return createServer(async (req, res) => {
    const method = req.method || 'GET';
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    try {
      if (method === 'GET' && url.pathname === '/health') {
        sendJson(res, 200, { status: 'ok', service: 'authentication' });
        return;
      }

      if (method === 'POST' && url.pathname === '/auth/register') {
        const body = (await readJson(req)) as {
          username?: string;
          password?: string;
          roles?: Role[];
        };
        if (!body.username || !body.password) {
          sendJson(res, 400, { error: 'Missing username or password' });
          return;
        }

        const roles =
          Array.isArray(body.roles) && body.roles.length > 0
            ? body.roles.map(mapRole)
            : [Role.RETAILER];
        const user = await service.createUser(body.username, body.password, roles);
        sendJson(res, 201, user);
        return;
      }

      if (method === 'POST' && url.pathname === '/auth/login') {
        const body = (await readJson(req)) as { username?: string; password?: string };
        if (!body.username || !body.password) {
          sendJson(res, 400, { error: 'Missing username or password' });
          return;
        }

        const authToken = await service.authenticate(
          { username: body.username, password: body.password },
          {
            ipAddress: req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
          }
        );

        sendJson(res, 200, authToken);
        return;
      }

      if (method === 'POST' && url.pathname === '/auth/validate') {
        const body = (await readJson(req)) as { token?: string };
        const bearer = req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice('Bearer '.length)
          : undefined;
        const token = body.token || bearer;
        if (!token) {
          sendJson(res, 400, { valid: false, error: 'Token required' });
          return;
        }

        const validation = await service.validateToken(token);
        sendJson(res, 200, validation);
        return;
      }

      sendJson(res, 404, { error: 'Not Found' });
    } catch (error) {
      sendJson(res, 500, {
        error: 'Authentication service error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }).listen(cfg.port);
}

export function startAuthenticationService(config: Partial<AuthenticationServiceConfig> = {}) {
  const cfg = { ...defaultConfig, ...config };
  const server = createAuthenticationServer(cfg);
  return server;
}

if (require.main === module) {
  const server = startAuthenticationService();
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : defaultConfig.port;
  console.log(`[authentication] listening on port ${port}`);
}

export * from '@port-to-shelf/shared-types';
export * from './services/auth.service';
export * from './services/authorization.service';
export * from './repositories/user.repository';
export * from './repositories/auth-log.repository';
export * from './middleware/auth.middleware';
