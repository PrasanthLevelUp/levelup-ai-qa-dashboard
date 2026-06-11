/**
 * Environment configuration.
 *
 * Centralises per-environment base URLs and credentials. Select an environment
 * with the `TEST_ENV` env var (defaults to `qa`). Never commit real secrets —
 * read them from environment variables in CI.
 */
export interface EnvConfig {
  baseURL: string;
  credentials: {
    username: string;
    password: string;
  };
}

const environments: Record<string, EnvConfig> = {
  local: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    credentials: {
      username: process.env.TEST_USERNAME || 'Admin',
      password: process.env.TEST_PASSWORD || 'admin123',
    },
  },
  qa: {
    baseURL: process.env.BASE_URL || 'https://opensource-demo.orangehrmlive.com',
    credentials: {
      username: process.env.TEST_USERNAME || 'Admin',
      password: process.env.TEST_PASSWORD || 'admin123',
    },
  },
  staging: {
    baseURL: process.env.BASE_URL || 'https://staging.example.com',
    credentials: {
      username: process.env.TEST_USERNAME || '',
      password: process.env.TEST_PASSWORD || '',
    },
  },
};

const current = process.env.TEST_ENV || 'qa';

export const env: EnvConfig = environments[current] ?? environments.qa;
export default env;
