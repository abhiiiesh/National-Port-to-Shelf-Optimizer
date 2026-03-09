import { group, sleep } from 'k6';
import { apiGet, smokePaths, validateApiResponse } from './common.js';

export const options = {
  scenarios: {
    sudden_spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1200,
      stages: [
        { target: 20, duration: '30s' },
        { target: 500, duration: '45s' },
        { target: 500, duration: '45s' },
        { target: 20, duration: '30s' },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.15'],
    http_req_duration: ['p(95)<1500'],
  },
};

export default function () {
  group('spike: sudden traffic burst', () => {
    for (const path of smokePaths) {
      validateApiResponse(apiGet(path));
    }
  });

  sleep(0.1);
}
