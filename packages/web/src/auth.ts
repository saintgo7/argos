import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { loginUser } from '@/lib/server/auth-actions'

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

        // middleware.ts가 node runtime으로 설정돼 있으므로 bcrypt/Prisma를
        // 그대로 eager import할 수 있다. 과거에 쓰던 dynamic-variable-import
        // 트릭은 standalone build에서 webpack이 모듈을 트레이싱하지 못해
        // 런타임에 "Cannot find module" 에러가 났다.
        const result = await loginUser({ email, password })
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
