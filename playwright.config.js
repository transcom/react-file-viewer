const { devices } = require('@playwright/test');

module.exports = {
  testDir: './tests/playwright',
  timeout: 30000,
  exclude: ['./tests/components'],
};
