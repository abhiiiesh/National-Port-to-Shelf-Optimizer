import { group, sleep } from 'k6';
import { apiGet, smokePaths, validateApiResponse } from './common.js';

export const options = {
  scenarios: {
    stress_ramp: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 250 },
        { duration: '2m', target: 400 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<1200'],
  },
};

export default function () {
  group('stress: mixed endpoint probing', () => {
    const path = smokePaths[Math.floor(Math.random() * smokePaths.length)];
    validateApiResponse(apiGet(path));
  });

  sleep(0.3);
}
