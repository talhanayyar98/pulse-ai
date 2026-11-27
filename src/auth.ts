import NextAuth, { type DefaultSession } from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";
import { upsertUserForAccount } from "@/lib/server/users";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    uid?: string;
  }
}

export const DEV_PROVIDER_ID = "dev";

function providers(): Provider[] {
  const list: Provider[] = [];
  if (env.googleAuthConfigured) list.push(Google);
  if (env.devLoginEnabled) {
    list.push(
      Credentials({
        id: DEV_PROVIDER_ID,
        name: "Dev user",
        credentials: {},
        authorize: () => ({ id: "dev-user", email: "dev@pulse.local", name: "Dev User" }),
      }),
    );
  }
  return list;
}

// Lazy config: providers depend on env vars read at request time, not at build time.
export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  providers: providers(),
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async jwt({ token, account, user }) {
      // `account` is only present on sign-in: map the identity to our own user id once.
      if (account) {
        token.uid = await upsertUserForAccount({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: user.email ?? null,
          name: user.name ?? null,
          image: user.image ?? null,
        });
      }
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid;
      return session;
    },
  },
}));
