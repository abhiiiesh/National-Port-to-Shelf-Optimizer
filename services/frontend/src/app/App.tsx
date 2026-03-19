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

const roleOptions: UserRole[] = [
  'OPERATIONS_MANAGER',
  'PORT_ADMIN',
  'AUCTION_OPERATOR',
  'EXECUTIVE_STAKEHOLDER',
  'ADMIN',
];

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
  const allowedNavItems = appRoutes.filter((item) => item.allowedRoles.includes(role));
  const currentCapability = getRoleCapability(role);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <BrandLogo />
          <div>
            <h1>National Port-to-Shelf</h1>
            <p>AI Logistics Command Center</p>
          </div>
        </div>
        <nav className="nav-group">
          {allowedNavItems.map((item) => (
            <Link
              className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              key={item.path}
              to={item.path}
            >
              {item.key === 'admin-console'
                ? 'Access Control'
                : item.path
                    .slice(1)
                    .replace('-', ' ')
                    .replace(/^./, (c) => c.toUpperCase())}
            </Link>
          ))}
        </nav>
        <div className="sidebar-panel">
          <div className="kpi-label">Role intent</div>
          <strong>{currentCapability.label}</strong>
          <p>{currentCapability.description}</p>
        </div>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="cluster">
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
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/slots" element={<SlotsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/access-control" element={<AccessControlPage />} />
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
