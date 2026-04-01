import { buildKpiDeltaView } from '../features/analytics/kpi';
import { selectAuctionWinner } from '../features/auctions/board';
import { buildBulletinPreview, resolveEffectiveRoute } from '../features/news/communications';
import { recommendSlots } from '../features/slots/planner';
import { buildTrackingTimeline } from '../features/tracking/timeline';
import { buildUlipSyncBanner } from '../features/ulip/sync-status';

describe('domain UX implementation tracks', () => {
  it('builds tracking timeline with anomaly flags', () => {
    const timeline = buildTrackingTimeline([
      { vesselId: 'v1', vesselName: 'Atlas', eta: '2026-03-10T10:00:00Z', status: 'DELAYED' },
    ]);

    expect(timeline[0].delayRisk).toBe('HIGH');
    expect(timeline[0].anomalyFlags).toContain('DELAYED_ETA');
  });

  it('recommends best slot order by score', () => {
    const recommendations = recommendSlots([
      { slotId: 's1', mode: 'ROAD', availableCapacity: 3, etaHours: 15 },
      { slotId: 's2', mode: 'RAIL', availableCapacity: 9, etaHours: 10 },
    ]);

    expect(recommendations[0].slotId).toBe('s2');
    expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
  });

  it('selects auction winner and tie-breaks by earliest timestamp', () => {
    const outcome = selectAuctionWinner([
      { bidderId: 'A', amount: 1000, submittedAtIso: '2026-03-09T10:00:01Z' },
      { bidderId: 'B', amount: 1000, submittedAtIso: '2026-03-09T10:00:00Z' },
    ]);

    expect(outcome?.winnerBidderId).toBe('B');
    expect(outcome?.tieBreakReason).toBe('EARLIEST_TIMESTAMP');
  });

  it('builds KPI delta view with filter context', () => {
    const view = buildKpiDeltaView(
      { totalShipments: 100, delayedShipments: 8, avgTransitHours: 11.234 },
      12,
      { route: 'MUM-DEL', mode: 'RAIL', period: 'WEEKLY' },
    );

    expect(view.delayedRatePercent).toBe(8);
    expect(view.comparisonLabel).toContain('MUM-DEL');
  });

  it('builds ULIP sync banner severity for conflict and staleness', () => {
    const critical = buildUlipSyncBanner({
      source: 'ULIP',
      syncedAtIso: '2026-03-09T10:00:00Z',
      freshnessMinutes: 10,
      conflictCount: 3,
    });

    const warning = buildUlipSyncBanner({
      source: 'ULIP',
      syncedAtIso: '2026-03-09T10:00:00Z',
      freshnessMinutes: 45,
      conflictCount: 0,
    });

    expect(critical.severity).toBe('critical');
    expect(warning.severity).toBe('warning');
  });

  it('auto-routes communications to congestion response when critical bulletin exists', () => {
    const route = resolveEffectiveRoute(
      ['Info', 'Critical'],
      'ROUTE-OPS-1',
      [
        { id: 'ROUTE-OPS-1', name: 'Operations Command Chain', owner: 'NOC Duty Manager' },
        { id: 'ROUTE-OPS-2', name: 'Port Congestion Response', owner: 'Port Operations Lead' },
      ],
    );

    expect(route.id).toBe('ROUTE-OPS-2');
  });

  it('builds bulletin preview text from selected communication template', () => {
    const preview = buildBulletinPreview(
      'TPL-OPS-CRIT',
      [
        { id: 'TPL-OPS-STD', name: 'Standard', bodyPrefix: '[OPS NOTICE]' },
        { id: 'TPL-OPS-CRIT', name: 'Critical', bodyPrefix: '[CRITICAL ALERT]' },
      ],
      'Auction lane saturation alert',
    );

    expect(preview).toBe('[CRITICAL ALERT] Auction lane saturation alert');
  });
});
