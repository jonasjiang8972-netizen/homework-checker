import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { verifyCode } from '../send-code/route';

const handler = NextAuth({
  providers: [
    Credentials({
      id: 'email-code',
      name: '邮箱验证码',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        code: { label: '验证码', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.code) return null;
        const email = (credentials.email as string).trim().toLowerCase();
        const code = (credentials.code as string).trim();
        if (!verifyCode(email, code)) return null;
        return { id: email, email, name: email.split('@')[0] };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
        secure: false,
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) token.email = user.email;
      return token;
    },
    async session({ session, token }) {
      if (token.email) session.user!.email = token.email;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
