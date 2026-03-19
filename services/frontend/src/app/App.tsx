import React from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { TrackingPage } from './pages/TrackingPage';
import { AuctionsPage } from './pages/AuctionsPage';
import { SlotsPage } from './pages/SlotsPage';
import { ReportsPage } from './pages/ReportsPage';
import { NewsPage } from './pages/NewsPage';

type Role = 'OPERATIONS_MANAGER' | 'PORT_ADMIN' | 'AUCTION_OPERATOR';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/tracking', label: 'Tracking' },
  { path: '/auctions', label: 'Auctions' },
  { path: '/slots', label: 'Slots' },
  { path: '/reports', label: 'Reports' },
  { path: '/news', label: 'News' },
];

function RoleSelector(): JSX.Element {
  const [role, setRole] = React.useState<Role>('OPERATIONS_MANAGER');

  return (
    <div className="cluster">
      <span className="tag">Role</span>
      <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
        <option value="OPERATIONS_MANAGER">Operations Manager</option>
        <option value="PORT_ADMIN">Port Admin</option>
        <option value="AUCTION_OPERATOR">Auction Operator</option>
      </select>
    </div>
  );
}

export function App(): JSX.Element {
  const location = useLocation();

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="logo-badge">NP</span>
          <div>
            <h1>National Port-to-Shelf</h1>
            <p>AI Logistics Command Center</p>
          </div>
        </div>
        <nav className="nav-group">
          {navItems.map((item) => (
            <Link
              className={`nav-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}
              key={item.path}
              to={item.path}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="content">
        <header className="topbar">
          <div className="cluster">
            <span className="tag good">Staging Live</span>
            <span className="tag">API Connectivity: Healthy</span>
            <span className="tag">Notifications: 2</span>
          </div>
          <RoleSelector />
        </header>

        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/slots" element={<SlotsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/news" element={<NewsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
