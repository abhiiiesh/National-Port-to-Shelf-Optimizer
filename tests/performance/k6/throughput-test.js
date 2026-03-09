import { group } from 'k6';
import { apiGet, smokePaths, validateApiResponse } from './common.js';

const targetRps = Number(__ENV.TARGET_RPS || 10000);

export const options = {
  scenarios: {
    throughput_target: {
      executor: 'constant-arrival-rate',
      rate: targetRps,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: Number(__ENV.PRE_ALLOCATED_VUS || 500),
      maxVUs: Number(__ENV.MAX_VUS || 5000),
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.1'],
    http_req_duration: ['p(95)<1000'],
    dropped_iterations: ['rate<0.05'],
  },
};

export default function () {
  group('throughput: target requests per second', () => {
    const path = smokePaths[Math.floor(Math.random() * smokePaths.length)];
    validateApiResponse(apiGet(path));
  });
}
