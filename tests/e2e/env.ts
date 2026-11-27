/** Environment for the e2e server. A dedicated database, dropped before every run. */
export const E2E_MONGODB_URI = process.env.MONGODB_URI_E2E ?? "mongodb://127.0.0.1:27017/pulse_e2e";

export const e2eServerEnv = {
  MONGODB_URI: E2E_MONGODB_URI,
  AUTH_SECRET: "e2e-only-secret-never-use-in-production-000",
  AUTH_TRUST_HOST: "true",
  AUTH_DEV_LOGIN: "true",
};
