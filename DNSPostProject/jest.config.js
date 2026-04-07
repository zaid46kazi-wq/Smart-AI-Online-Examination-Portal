module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'server.js',
    'deploy-db.js',
    '!node_modules/**',
    '!temp_restore/**',
  ],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  verbose: true,
};
