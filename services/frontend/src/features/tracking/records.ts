import type { FrontendVesselSummary } from '../../config/contracts';
import { trackingRecords, type TrackingRecord } from '../../app/mock-data';

const formatEta = (iso: string): string => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return 'ETA pending';
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
    .format(parsed)
    .replace(',', ' ·');
};

const statusMap: Record<FrontendVesselSummary['status'], TrackingRecord['status']> = {
  ON_TIME: 'On Track',
  DELAYED: 'Delay Risk',
  ARRIVED: 'On Track',
};

const priorityForStatus = (status: FrontendVesselSummary['status']): TrackingRecord['priority'] => {
  if (status === 'DELAYED') {
    return 'High';
  }

  if (status === 'ARRIVED') {
    return 'Low';
  }

  return 'Medium';
};

const slaForStatus = (status: FrontendVesselSummary['status']): TrackingRecord['sla'] => {
  if (status === 'DELAYED') {
    return 'Watch';
  }

  return 'Healthy';
};

export const mergeTrackingRecords = (vessels: FrontendVesselSummary[]): TrackingRecord[] => {
  if (vessels.length === 0) {
    return trackingRecords;
  }

  return vessels.map((vessel, index) => {
    const template =
      trackingRecords.find((record) => record.vessel === vessel.vesselName) ??
      trackingRecords[index % trackingRecords.length];

    return {
      ...template,
      id: `LIVE-${vessel.vesselId}`,
      vessel: vessel.vesselName,
      eta: formatEta(vessel.eta),
      status: statusMap[vessel.status],
      priority: priorityForStatus(vessel.status),
      sla: slaForStatus(vessel.status),
      delayReason:
        vessel.status === 'DELAYED'
          ? 'Live API feed reports a delay condition; operator review is recommended.'
          : vessel.status === 'ARRIVED'
            ? 'Live API feed confirms vessel arrival; finalize downstream handoff.'
            : 'Live API feed is healthy; continue proactive monitoring.',
      assignedAction:
        vessel.status === 'DELAYED'
          ? 'Review the latest live movement signal, validate ETA impact, and coordinate mitigation.'
          : vessel.status === 'ARRIVED'
            ? 'Confirm gate-in completion and transition the shipment to the next operational leg.'
            : 'Maintain watchlist coverage and prepare downstream dispatch confirmation.',
      milestones: template.milestones.map((milestone, milestoneIndex) => {
        if (vessel.status === 'ARRIVED' && milestoneIndex === template.milestones.length - 1) {
          return { ...milestone, status: 'completed' as const, time: formatEta(vessel.eta) };
        }

        if (vessel.status === 'DELAYED' && milestoneIndex === template.milestones.length - 1) {
          return {
            ...milestone,
            status: 'upcoming' as const,
            time: `${formatEta(vessel.eta)} (revised)`,
          };
        }

        return milestone;
      }),
    };
  });
};
