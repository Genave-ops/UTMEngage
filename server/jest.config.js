module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js'
  ],
  // Increase timeout for database operations
  testTimeout: 30000,
  // Setup file for test environment
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
  // Ensure tests run in sequence to avoid DB conflicts
  maxWorkers: 1,
  // Verbose output for debugging
  verbose: true,
  // Force exit after tests complete
  forceExit: true,
  // Detect open handles
  detectOpenHandles: true
};
