import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { SupabaseAdapter } from '@auth/supabase-adapter';
import { verifyCode } from '../send-code/route';

function getAdapter() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret || url.startsWith('your_')) return undefined;
  return SupabaseAdapter({ url, secret });
}

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
  adapter: getAdapter(),
  session: { strategy: 'jwt' },
  pages: { signIn: '/settings' },
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
