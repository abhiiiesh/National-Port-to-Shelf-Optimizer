import React from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BrandLogo } from './components.BrandLogo';
import { getRoleCapability, type UserRole } from './access-control';
import { resolveRouteForUser } from './navigation';
import { appRoutes } from './routes';
import { AccessControlPage } from './pages/AccessControlPage';
import { DashboardPage } from './pages/DashboardPage';
import { TrackingPage } from './pages/TrackingPage';
import { AuctionsPage } from './pages/AuctionsPage';
import { SlotsPage } from './pages/SlotsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NewsPage } from './pages/NewsPage';
import { getStoredSidebarCollapsed, setStoredSidebarCollapsed } from '../config/session';

const roleOptions: UserRole[] = [
  'OPERATIONS_MANAGER',
  'PORT_ADMIN',
  'AUCTION_OPERATOR',
  'EXECUTIVE_STAKEHOLDER',
  'ADMIN',
];
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
  const [role, setRole] = React.useState<UserRole>('OPERATIONS_MANAGER');
  const [isCompactSidebar, setIsCompactSidebar] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const allowedNavItems = appRoutes.filter((item) => item.allowedRoles.includes(role));
  const currentCapability = getRoleCapability(role);

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
            <span className="tag">Notifications: 2</span>
          </div>
          <RoleSelector role={role} setRole={setRole} />
        </header>

        <main className="main">
          <AccessBoundary role={role} />
          <Routes>
            <Route path="/" element={<Navigate to={currentCapability.defaultRoute} replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tracking" element={<TrackingPage activeRole={role} />} />
            <Route path="/auctions" element={<AuctionsPage activeRole={role} />} />
            <Route path="/slots" element={<SlotsPage />} />
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
