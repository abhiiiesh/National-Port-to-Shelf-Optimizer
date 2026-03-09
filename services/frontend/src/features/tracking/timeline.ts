import type { FrontendVesselSummary } from '../../config/contracts';

export interface TrackingTimelineItem {
  vesselId: string;
  vesselName: string;
  eta: string;
  delayRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  anomalyFlags: string[];
}

export const buildTrackingTimeline = (vessels: FrontendVesselSummary[]): TrackingTimelineItem[] =>
  vessels.map((vessel) => {
    const anomalyFlags: string[] = [];

    if (vessel.status === 'DELAYED') {
      anomalyFlags.push('DELAYED_ETA');
    }

    if (vessel.status === 'ARRIVED') {
      anomalyFlags.push('ARRIVAL_CONFIRMED');
    }

    return {
      vesselId: vessel.vesselId,
      vesselName: vessel.vesselName,
      eta: vessel.eta,
      delayRisk: vessel.status === 'DELAYED' ? 'HIGH' : 'LOW',
      anomalyFlags,
    };
  });
