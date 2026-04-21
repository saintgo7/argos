import 'server-only'

import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import { db } from './db'
import { signJwt } from './jwt'

export interface AuthResultUser {
  id: string
  email: string
  name: string
  createdAt: Date
}

export interface AuthResult {
  token: string
  user: AuthResultUser
}

/**
 * 로그인 비즈니스 로직.
 * 자격 증명이 유효하면 새 JWT를 발급하고 CliToken을 생성한 뒤 반환한다.
 * 실패 시 null 반환 (호출 측에서 401 등으로 매핑).
 */
export async function loginUser(input: {
  email: string
  password: string
}): Promise<AuthResult | null> {
  const { email, password } = input

  const user = await db.user.findUnique({ where: { email } })
  if (!user) return null

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) return null

  const token = await signJwt(user.id)
  const tokenHash = createHash('sha256').update(token).digest('hex')

  await db.cliToken.create({
    data: {
      userId: user.id,
      tokenHash,
    },
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  }
}

/**
 * 회원가입 비즈니스 로직.
 * 이메일 중복 시 'EMAIL_IN_USE' 반환, 그 외에는 AuthResult.
 */
export async function registerUser(input: {
  email: string
  password: string
  name: string
}): Promise<AuthResult | 'EMAIL_IN_USE'> {
  const { email, password, name } = input

  const existingUser = await db.user.findUnique({ where: { email } })
  if (existingUser) return 'EMAIL_IN_USE'

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await db.user.create({
    data: { email, passwordHash, name },
  })

  const token = await signJwt(user.id)
  const tokenHash = createHash('sha256').update(token).digest('hex')

  await db.cliToken.create({
    data: {
      userId: user.id,
      tokenHash,
    },
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  }
}
