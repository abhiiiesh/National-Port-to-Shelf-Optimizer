export interface UlipSyncRecord {
  source: 'ULIP';
  syncedAtIso: string;
  freshnessMinutes: number;
  conflictCount: number;
}

export interface UlipSyncBannerView {
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export const buildUlipSyncBanner = (record: UlipSyncRecord): UlipSyncBannerView => {
  if (record.conflictCount > 0) {
    return {
      severity: 'critical',
      message: `ULIP reconciliation has ${record.conflictCount} conflict(s). Review audit trail.`,
    };
  }

  if (record.freshnessMinutes > 30) {
    return {
      severity: 'warning',
      message: `ULIP sync is stale (${record.freshnessMinutes} min). Retry in progress.`,
    };
  }

  return {
    severity: 'info',
    message: `ULIP sync healthy. Last sync at ${record.syncedAtIso}.`,
  };
};
