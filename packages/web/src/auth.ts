import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null
        }

        // Edge 런타임에서 평가되지 않도록 dynamic import 사용.
        // middleware는 authorize를 호출하지 않으므로 bcrypt/Prisma가 Edge 번들에 포함되지 않는다.
        // 변수를 통한 import로 tsc(NodeNext)와 webpack(path alias) 양쪽 모두 호환되게 한다.
        const modulePath = '@/lib/server/auth-actions'
        const mod: typeof import('./lib/server/auth-actions') = await import(modulePath)
        const result = await mod.loginUser({ email, password })
        if (!result) return null

        const { token, user } = result
        return { ...user, argosToken: token }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.argosToken = user.argosToken
      return token
    },
    async session({ session, token }) {
      session.argosToken = token.argosToken as string
      return session
    },
  },
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
})
