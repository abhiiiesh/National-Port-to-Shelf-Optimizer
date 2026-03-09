import http from 'k6/http';
import { check } from 'k6';

const ULIP_BASE_URL = __ENV.ULIP_BASE_URL || 'http://localhost:3007';

export const options = {
  scenarios: {
    ulip_event_latency: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '30s', target: 30 },
        { duration: '1m', target: 60 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<30000'],
  },
};

export default function () {
  const payload = JSON.stringify({
    eventId: `perf-${__VU}-${Date.now()}`,
    eventType: 'container.mode.changed',
    timestamp: new Date().toISOString(),
    source: 'performance-test',
    version: 1,
    payload: {
      containerId: 'ABCD1234567',
      mode: 'RAIL',
      locationId: 'INMUM',
    },
  });

  const response = http.post(`${ULIP_BASE_URL}/ulip/events`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'ulip response status is healthy': (res) => res.status < 500,
    'ulip publish latency < 30 seconds': (res) => res.timings.duration < 30000,
  });
}
