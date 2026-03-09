import { group, sleep } from 'k6';
import { apiGet, smokePaths, validateApiResponse } from './common.js';

export const options = {
  scenarios: {
    steady_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 25 },
        { duration: '3m', target: 25 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  group('load: read-heavy api traffic', () => {
    for (const path of smokePaths) {
      validateApiResponse(apiGet(path));
    }
  });

  sleep(1);
}
