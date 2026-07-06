import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getDb, execute, queryOne } from '../../../../lib/db';
import { verifyPassword, getEmailVerifiedStatus, calculateNextDueDate } from '../../../../lib/password';

const handler = NextAuth({
  providers: [
    Credentials({
      id: 'credentials',
      name: '邮箱密码',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const password = credentials.password;

        await getDb();
        const user = queryOne(
          'SELECT id, email, name, password_hash, email_verified, email_due_at FROM users WHERE email = ?',
          [email]
        );
        if (!user) return null;

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) return null;

        execute(
          'UPDATE users SET last_login_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?',
          [user.id]
        );

        const { verified, needsVerify } = getEmailVerifiedStatus({
          email_verified: user.email_verified,
          email_due_at: user.email_due_at,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name || user.email.split('@')[0],
          emailVerified: verified,
          needsEmailVerify: needsVerify,
        };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  pages: { signIn: '/settings' },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.emailVerified = (user as any).emailVerified;
        token.needsEmailVerify = (user as any).needsEmailVerify;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.email) {
        (session.user as any).email = token.email;
        (session.user as any).name = token.name;
        (session.user as any).emailVerified = token.emailVerified;
        (session.user as any).needsEmailVerify = token.needsEmailVerify;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
