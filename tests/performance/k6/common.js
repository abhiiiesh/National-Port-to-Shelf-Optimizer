import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

if (AUTH_TOKEN) {
  defaultHeaders.Authorization = `Bearer ${AUTH_TOKEN}`;
}

export function apiGet(path) {
  return http.get(`${BASE_URL}${path}`, { headers: defaultHeaders });
}

export function validateApiResponse(response) {
  return check(response, {
    'response is not a server error': (res) => res.status < 500,
    'response duration under 2s': (res) => res.timings.duration < 2000,
  });
}

export const smokePaths = [
  '/api/v1/vessels',
  '/api/v1/containers',
  '/api/v1/auctions',
  '/api/v1/metrics/performance',
  '/api/v1/reports',
];
