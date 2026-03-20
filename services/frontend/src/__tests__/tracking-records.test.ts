import { mergeTrackingRecords } from '../features/tracking/records';

describe('tracking record adapter', () => {
  it('falls back to mock records when live payload is empty', () => {
    const records = mergeTrackingRecords([]);

    expect(records.length).toBeGreaterThan(0);
    expect(records[0].id.startsWith('TRK-')).toBe(true);
  });

  it('maps live vessels into tracking records with dynamic ids and delay context', () => {
    const records = mergeTrackingRecords([
      {
        vesselId: 'v-123',
        vesselName: 'MV Horizon Star',
        eta: '2026-03-20T11:30:00Z',
        status: 'DELAYED',
      },
    ]);

    expect(records[0]).toMatchObject({
      id: 'LIVE-v-123',
      vessel: 'MV Horizon Star',
      status: 'Delay Risk',
      priority: 'High',
      sla: 'Watch',
    });
    expect(records[0].delayReason).toContain('Live API feed reports a delay condition');
  });
});
