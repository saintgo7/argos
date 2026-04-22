export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string | null
  createdAt: string
}

export interface LoginResponse {
  token: string
  user: User
}

export type OrgRole = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER'

export interface OrgMembership {
  id: string
  userId: string
  orgId: string
  role: OrgRole
}
