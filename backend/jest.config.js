/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/integration/setup.ts',
  setupFiles: ['<rootDir>/tests/integration/testEnv.ts'],
  testMatch: ['**/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/app.ts' // excluded for pure logic testing
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    './src/services/hashEngine.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
    './src/services/verificationService.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    }
  }
};
