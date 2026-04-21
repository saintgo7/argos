import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { verifyJwt } from '@/lib/server/jwt'
import { getProjectForUser } from '@/lib/server/project-actions'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  const { projectId } = await params

  // session.argosToken → userId → 직접 비즈니스 로직 호출
  let projectName = 'Project'
  try {
    const payload = await verifyJwt(session.argosToken)
    if (payload) {
      const result = await getProjectForUser(projectId, payload.sub)
      if (result.kind === 'ok') {
        projectName = result.project.name
      }
    }
  } catch {
    // 기본 프로젝트 이름 사용
  }

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header projectName={projectName} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
