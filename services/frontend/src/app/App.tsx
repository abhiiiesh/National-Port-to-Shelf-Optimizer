import React from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BrandLogo } from './components.BrandLogo';
import { getRoleCapability, mapExternalRoleToUserRole, type UserRole } from './access-control';
import { resolveRouteForUser } from './navigation';
import { appRoutes } from './routes';
import { AccessControlPage } from './pages/AccessControlPage';
import { DashboardPage } from './pages/DashboardPage';
import { TrackingPage } from './pages/TrackingPage';
import { AuctionsPage } from './pages/AuctionsPage';
import { SlotsPage } from './pages/SlotsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NewsPage } from './pages/NewsPage';
import { fetchAuthValidation, loginToAuthService } from '../shared/api-client';
import type { FrontendAuthToken, FrontendAuthValidation } from '../config/contracts';
import {
  clearStoredAccessToken,
  getStoredSidebarCollapsed,
  setStoredAccessToken,
  setStoredSidebarCollapsed,
} from '../config/session';

const SIDEBAR_BREAKPOINT_PX = 1100;
const navIcons: Record<string, string> = {
  '/dashboard': '⌂',
  '/tracking': '◎',
  '/slots': '▣',
  '/auctions': '◌',
  '/reports': '▤',
  '/news': '✦',
  '/access-control': '⚙',
};

function AccessBoundary({ role }: { role: UserRole }): JSX.Element {
  const location = useLocation();
  const resolution = resolveRouteForUser(location.pathname, role);

  if (resolution.reason === 'unauthorized' && resolution.redirectTo) {
    return <Navigate to={resolution.redirectTo} replace />;
  }

  return <></>;
}

function RoleSelector({
  roleOptions,
  role,
  setRole,
}: {
  roleOptions: UserRole[];
  role: UserRole;
  setRole: (role: UserRole) => void;
}): JSX.Element {
  const capability = getRoleCapability(role);

  return (
    <div className="cluster role-panel">
      <div>
        <div className="tag">Active role</div>
        <div className="role-label">{capability.label}</div>
      </div>
      <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
        {roleOptions.map((option) => (
          <option value={option} key={option}>
            {getRoleCapability(option).label}
          </option>
        ))}
      </select>
    </div>
  );
}

const resolveAssignedRoles = (roles: unknown): UserRole[] => {
  const safeRoles: string[] = [];
  if (Array.isArray(roles)) {
    for (const role of roles) {
      if (typeof role === 'string') {
        safeRoles.push(role);
      }
    }
  }

  const mappedRoles: UserRole[] = [];
  for (const externalRole of safeRoles) {
    mappedRoles.push(mapExternalRoleToUserRole(externalRole));
  }

  const uniqueRoles: UserRole[] = [];
  for (const mappedRole of mappedRoles) {
    if (!uniqueRoles.includes(mappedRole)) {
      uniqueRoles.push(mappedRole);
    }
  }

  return uniqueRoles.length > 0 ? uniqueRoles : ['OPERATIONS_MANAGER'];
};

function AccessBoundary({ role }: { role: UserRole }): JSX.Element {
  const location = useLocation();
  const resolution = resolveRouteForUser(location.pathname, role);

  if (resolution.reason === 'unauthorized' && resolution.redirectTo) {
    return <Navigate to={resolution.redirectTo} replace />;
  }

  return <></>;
}

function RoleSelector({
  role,
  setRole,
}: {
  role: UserRole;
  setRole: (role: UserRole) => void;
}): JSX.Element {
  const capability = getRoleCapability(role);

  return (
    <div className="cluster role-panel">
      <div>
        <div className="tag">Active role</div>
        <div className="role-label">{capability.label}</div>
      </div>
      <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
        {roleOptions.map((option) => (
          <option value={option} key={option}>
            {getRoleCapability(option).label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function App(): JSX.Element {
  const location = useLocation();
  const [assignedRoles, setAssignedRoles] = React.useState<UserRole[]>(['OPERATIONS_MANAGER']);
  const [role, setRole] = React.useState<UserRole>('OPERATIONS_MANAGER');
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [authUserId, setAuthUserId] = React.useState<string>('');
  const [authBusy, setAuthBusy] = React.useState(false);
  const [authError, setAuthError] = React.useState<string | null>(null);
  const [loginForm, setLoginForm] = React.useState({ username: 'admin', password: 'admin123' });
  const [isCompactSidebar, setIsCompactSidebar] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const allowedNavItems = appRoutes.filter((item) => item.allowedRoles.includes(role));
  const currentCapability = getRoleCapability(role);

  React.useEffect(() => {
    const hydrateSession = async (): Promise<void> => {
      setAuthBusy(true);
      setAuthError(null);
      try {
        const validation: FrontendAuthValidation = await fetchAuthValidation();
        if (!validation.valid) {
          setIsAuthenticated(false);
          return;
        }

        const uniqueRoles = resolveAssignedRoles(validation.roles);
        const primaryRole: UserRole = uniqueRoles[0] ?? 'OPERATIONS_MANAGER';
        setAssignedRoles(uniqueRoles);
        setRole(primaryRole);
        setAuthUserId(validation.userId ?? 'authenticated-user');
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthBusy(false);
      }
    };

    void hydrateSession();
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncSidebarMode = (): void => {
      const compact = window.innerWidth < SIDEBAR_BREAKPOINT_PX;
      const persistedCollapsed = getStoredSidebarCollapsed();
      setIsCompactSidebar(compact);
      setIsSidebarOpen(compact ? false : !(persistedCollapsed ?? false));
    };

    syncSidebarMode();
    window.addEventListener('resize', syncSidebarMode);

    return () => {
      window.removeEventListener('resize', syncSidebarMode);
    };
  }, []);

  React.useEffect(() => {
    if (!isCompactSidebar) {
      setStoredSidebarCollapsed(!isSidebarOpen);
    }
  }, [isCompactSidebar, isSidebarOpen]);

  React.useEffect(() => {
    if (isCompactSidebar) {
      setIsSidebarOpen(false);
    }
  }, [isCompactSidebar, location.pathname]);

  const toggleSidebar = (): void => {
    setIsSidebarOpen((current) => {
      const next = !current;
      if (!isCompactSidebar) {
        setStoredSidebarCollapsed(!next);
      }

      return next;
    });
  };

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const token: FrontendAuthToken = await loginToAuthService(
        loginForm.username,
        loginForm.password
      );
      setStoredAccessToken(token.accessToken);
      const uniqueRoles = resolveAssignedRoles(token.roles);
      const primaryRole: UserRole = uniqueRoles[0] ?? 'OPERATIONS_MANAGER';
      setAssignedRoles(uniqueRoles);
      setRole(primaryRole);
      setAuthUserId(token.userId);
      setIsAuthenticated(true);
    } catch (error) {
      clearStoredAccessToken();
      setIsAuthenticated(false);
      setAuthError(
        error instanceof Error
          ? `Unable to login with provided credentials. ${error.message}`
          : 'Unable to login with provided credentials.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const logout = (): void => {
    clearStoredAccessToken();
    setIsAuthenticated(false);
    setAssignedRoles(['OPERATIONS_MANAGER']);
    setRole('OPERATIONS_MANAGER');
    setAuthUserId('');
  };

  if (!isAuthenticated) {
    return (
      <main className="main">
        <section className="card" style={{ maxWidth: '520px', margin: '40px auto' }}>
          <div className="brand" style={{ marginBottom: '12px' }}>
            <BrandLogo />
            <div>
              <h2 className="page-heading" style={{ marginBottom: '8px' }}>
                Stakeholder Portal Login
              </h2>
              <div className="kpi-label">
                Login with role-specific credentials. Feature access is resolved from your assigned
                role profile.
              </div>
            </div>
          </div>
          <form className="governance-form" onSubmit={(event) => void submitLogin(event)}>
            <input
              required
              placeholder="Username"
              value={loginForm.username}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, username: event.target.value }))
              }
            />
            <input
              required
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((current) => ({ ...current, password: event.target.value }))
              }
            />
            <button className="primary-button" type="submit" disabled={authBusy}>
              {authBusy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {authError ? <div className="notice compact-notice">{authError}</div> : null}
        </section>
      </main>
    );
  }

  return (
    <div
      className={`app-layout ${isSidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'} ${isCompactSidebar ? 'sidebar-compact-mode' : ''}`}
    >
      {isCompactSidebar && isSidebarOpen ? (
        <button
          aria-label="Close navigation panel"
          className="sidebar-overlay"
          type="button"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={`sidebar ${isSidebarOpen ? 'open' : 'collapsed'} ${isCompactSidebar ? 'compact' : ''}`}
      >
        <div className="sidebar-top-row">
          <div className="brand">
            <BrandLogo />
            <div className={`brand-copy ${isSidebarOpen ? '' : 'hidden'}`}>
              <h1>National Port-to-Shelf</h1>
              <p>AI Logistics Command Center</p>
            </div>
          </div>
          <button
            aria-label={isSidebarOpen ? 'Collapse navigation panel' : 'Expand navigation panel'}
            aria-pressed={isSidebarOpen}
            className="sidebar-toggle"
            type="button"
            onClick={toggleSidebar}
          >
            <span>{isSidebarOpen ? '←' : '→'}</span>
          </button>
        </div>
        <nav className="nav-group">
          {allowedNavItems.map((item) => (
            <Link
              className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              key={item.path}
              to={item.path}
              title={
                item.key === 'admin-console'
                  ? 'Access Control'
                  : item.path
                      .slice(1)
                      .replace('-', ' ')
                      .replace(/^./, (c) => c.toUpperCase())
              }
            >
              <span className="nav-icon" aria-hidden="true">
                {navIcons[item.path] ?? '•'}
              </span>
              {isSidebarOpen ? (
                <span className="nav-label">
                  {item.key === 'admin-console'
                    ? 'Access Control'
                    : item.path
                        .slice(1)
                        .replace('-', ' ')
                        .replace(/^./, (c) => c.toUpperCase())}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className={`sidebar-panel ${isSidebarOpen ? '' : 'hidden'}`}>
          <div className="kpi-label">Role intent</div>
          <strong>{currentCapability.label}</strong>
          <p>{currentCapability.description}</p>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="cluster">
            <button
              aria-label={isSidebarOpen ? 'Collapse navigation panel' : 'Expand navigation panel'}
              className="topbar-menu-button"
              type="button"
              onClick={toggleSidebar}
            >
              ☰
            </button>
            <span className="tag good">Staging Live</span>
            <span className="tag">API Connectivity: Healthy</span>
            <span className="tag">User: {authUserId}</span>
          </div>
          <div className="cluster">
            <RoleSelector roleOptions={assignedRoles} role={role} setRole={setRole} />
            <button className="secondary-button" type="button" onClick={logout}>
              Sign out
            </button>
          </div>
        </header>

        <main className="main">
          <AccessBoundary role={role} />
          <Routes>
            <Route path="/" element={<Navigate to={currentCapability.defaultRoute} replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tracking" element={<TrackingPage activeRole={role} />} />
            <Route path="/auctions" element={<AuctionsPage activeRole={role} />} />
            <Route path="/slots" element={<SlotsPage activeRole={role} />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/access-control" element={<AccessControlPage activeRole={role} />} />
            <Route
              path="/unauthorized"
              element={
                <section>
                  <h2 className="page-heading">Unauthorized</h2>
                  <div className="notice">
                    Your current role does not have access to this area. Switch role or request
                    approval in Access Control.
                  </div>
                </section>
              }
            />
            <Route
              path="*"
              element={
                <section>
                  <h2 className="page-heading">Page not found</h2>
                </section>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
