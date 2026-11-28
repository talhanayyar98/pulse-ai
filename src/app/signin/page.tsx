import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Logo } from "@/components/shell/Logo";
import { signInAsDevUser, signInWithGoogle } from "@/lib/auth-actions";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };

// Reads the session and provider config at request time.
export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/board");

  const google = env.googleAuthConfigured;
  const dev = env.devLoginEnabled;

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-sm animate-view-in overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
        {/* The board's four column hues, as a cap along the top of the card. */}
        <div aria-hidden className="flex h-1.5">
          <span className="flex-1 bg-slate" />
          <span className="flex-1 bg-info" />
          <span className="flex-1 bg-progress" />
          <span className="flex-1 bg-success" />
        </div>
        <div className="p-8">
          <Logo className="text-fg" />
          <h1 className="mt-10 text-6xl leading-[0.95] text-fg">
            Your tasks,
            <br />
            <em className="text-brand-text not-italic">with a pulse.</em>
          </h1>
          <p className="mt-3 text-sm text-fg-secondary">
            Sign in to sync your board, plans and reminders across every device.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            {google && (
              <form action={signInWithGoogle}>
                <SubmitButton variant="secondary">
                  <GoogleMark />
                  Continue with Google
                </SubmitButton>
              </form>
            )}
            {dev && (
              <form action={signInAsDevUser}>
                <SubmitButton variant={google ? "ghost" : "primary"}>
                  Continue as dev user
                </SubmitButton>
                <p className="mt-2 text-center font-mono text-[11px] text-fg-muted">
                  Local development only
                </p>
              </form>
            )}
            {!google && !dev && (
              <p className="rounded-xl border border-line bg-canvas p-4 text-sm text-fg-secondary">
                No sign-in method is configured. Set{" "}
                <code className="font-mono">AUTH_GOOGLE_ID</code> and{" "}
                <code className="font-mono">AUTH_GOOGLE_SECRET</code> (see the README).
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/** Google's "G" mark in its brand colours (required by Google's sign-in branding guidelines). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.73-3.78H1.33v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.33 14.31a7.2 7.2 0 0 1 0-4.62v-3.1H1.33a12 12 0 0 0 0 10.82l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.8l3.44-3.44A11.53 11.53 0 0 0 12 0 12 12 0 0 0 1.33 6.59l4 3.1A7.15 7.15 0 0 1 12 4.77Z"
      />
    </svg>
  );
}
