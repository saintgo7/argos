import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/dashboard/empty-state'
import { verifyJwt } from '@/lib/server/jwt'
import { getProjectsForUser } from '@/lib/server/project-actions'

export default async function DashboardPage() {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  // session.argosToken에서 userId 추출 후 비즈니스 로직 직접 호출
  let redirectTo: string | null = null
  try {
    const payload = await verifyJwt(session.argosToken)
    if (payload) {
      const projects = await getProjectsForUser(payload.sub)
      if (projects.length > 0) {
        redirectTo = `/dashboard/${projects[0].id}`
      }
    }
  } catch {
    // 실패 시 empty state로 fallback
  }

  if (redirectTo) {
    redirect(redirectTo)
  }

  return <EmptyState email={session.user?.email ?? ''} />
}
