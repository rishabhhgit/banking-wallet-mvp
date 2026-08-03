import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  setupFilesAfterSetup: [],
  testTimeout: 60000,
}

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long'
process.env.JWT_EXPIRES_IN = '1h'
process.env.NODE_ENV = 'test'

export default config
