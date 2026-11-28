/**
 * Server environment, read lazily so `next build` works without a database configured.
 * Auth.js reads AUTH_SECRET, AUTH_URL, AUTH_TRUST_HOST and AUTH_GOOGLE_* itself.
 */
export const env = {
  get mongodbUri(): string {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local.");
    return uri;
  },
  get googleAuthConfigured(): boolean {
    return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  },
  /** One-click "dev user" sign-in for local work and e2e tests. Never enable in production. */
  get devLoginEnabled(): boolean {
    return process.env.AUTH_DEV_LOGIN === "true";
  },
  /** Web Push (VAPID) keys and contact; null when push is not set up, so none is sent. */
  get vapid(): { publicKey: string; privateKey: string; subject: string } | null {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
  },
};
