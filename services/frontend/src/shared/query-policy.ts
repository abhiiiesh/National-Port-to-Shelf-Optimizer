export interface QueryPolicy {
  retryCount: number;
  retryDelayMs: number;
  staleTimeMs: number;
}

export const defaultQueryPolicy: QueryPolicy = {
  retryCount: 2,
  retryDelayMs: 250,
  staleTimeMs: 30_000,
};

export const resolveQueryPolicy = (overrides?: Partial<QueryPolicy>): QueryPolicy => ({
  ...defaultQueryPolicy,
  ...overrides,
});
