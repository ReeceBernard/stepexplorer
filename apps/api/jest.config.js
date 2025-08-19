// jest.config.js - Root configuration
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Set the root directory to apps/api
  rootDir: ".",

  // Look for tests in these directories
  roots: ["<rootDir>/src", "<rootDir>/tests"],

  // Test file patterns
  testMatch: [
    "**/tests/**/*.test.ts",
    "**/__tests__/**/*.test.ts",
    "**/?(*.)+(spec|test).ts",
  ],

  // TypeScript file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Transform TypeScript files
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },

  // Coverage settings
  collectCoverageFrom: [
    "<rootDir>/src/**/*.ts",
    "!<rootDir>/src/**/*.d.ts",
    "!<rootDir>/src/**/*.test.ts",
  ],

  // TypeScript configuration
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.json",
    },
  },

  // Verbose output
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Clear mocks between tests
  clearMocks: true,

  // Coverage directory
  coverageDirectory: "<rootDir>/coverage",

  // Coverage reporters
  coverageReporters: ["text", "lcov", "html"],
};
