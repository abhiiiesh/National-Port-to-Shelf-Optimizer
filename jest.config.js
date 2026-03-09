const runDbTests = process.env.RUN_DB_TESTS === 'true';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages', '<rootDir>/services'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    '/node_modules/',
    ...(runDbTests
      ? []
      : [
          '<rootDir>/services/authentication/src/__tests__/auth.test.ts',
          '<rootDir>/services/authentication/src/__tests__/auth.property.test.ts',
          '<rootDir>/services/authentication/src/__tests__/auth-logging.property.test.ts',
          '<rootDir>/packages/database/src/__tests__/',
        ]),
  ],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.test.ts',
    '!**/*.spec.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@port-to-shelf/shared-types$': '<rootDir>/packages/shared-types/src',
    '^@port-to-shelf/database$': '<rootDir>/packages/database/src',
  },
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsconfig: {
        noUnusedLocals: false,
        noUnusedParameters: false,
      },
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
