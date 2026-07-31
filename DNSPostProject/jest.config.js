module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/node_modules/**',
    '!node_modules/**',
  ],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
};
