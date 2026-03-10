import React from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { TrackingPage } from './pages/TrackingPage';
import { AuctionsPage } from './pages/AuctionsPage';
import { SlotsPage } from './pages/SlotsPage';

const navStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  marginBottom: '16px',
};

export function App(): JSX.Element {
  return (
    <main
      style={{
        fontFamily: 'Arial, sans-serif',
        margin: '0 auto',
        maxWidth: '960px',
        padding: '24px',
      }}
    >
      <h1>National Port-to-Shelf Optimizer</h1>
      <p>Operational UI shell for tracking, auctioning, and slot management workflows.</p>
      <nav style={navStyle}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/tracking">Tracking</Link>
        <Link to="/auctions">Auctions</Link>
        <Link to="/slots">Slots</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/auctions" element={<AuctionsPage />} />
        <Route path="/slots" element={<SlotsPage />} />
      </Routes>
    </main>
  );
}
