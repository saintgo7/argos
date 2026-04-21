import 'server-only'

import { db } from './db'

export interface ProjectListItem {
  id: string
  orgId: string
  orgName: string
  name: string
  slug: string
}

export interface ProjectDetail {
  id: string
  orgId: string
  name: string
  slug: string
  createdAt: Date
}

/**
 * 특정 유저가 멤버로 속한 모든 org의 프로젝트 목록을 반환한다.
 * GET /api/projects 와 dashboard 서버 컴포넌트에서 공유.
 */
export async function getProjectsForUser(
  userId: string
): Promise<ProjectListItem[]> {
  const projectList = await db.project.findMany({
    where: { organization: { memberships: { some: { userId } } } },
    include: { organization: true },
  })

  return projectList.map((p) => ({
    id: p.id,
    orgId: p.orgId,
    orgName: p.organization.name,
    name: p.name,
    slug: p.slug,
  }))
}

export type GetProjectForUserResult =
  | { kind: 'ok'; project: ProjectDetail }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }

/**
 * 특정 유저가 접근 가능한 프로젝트 1건을 반환한다.
 * - 프로젝트가 없으면 not_found
 * - 멤버가 아니면 forbidden
 * GET /api/projects/:projectId 와 dashboard layout에서 공유.
 */
export async function getProjectForUser(
  projectId: string,
  userId: string
): Promise<GetProjectForUserResult> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      orgId: true,
      name: true,
      slug: true,
      createdAt: true,
      organization: {
        select: {
          memberships: {
            where: { userId },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  })

  if (!project) {
    return { kind: 'not_found' }
  }

  if (project.organization.memberships.length === 0) {
    return { kind: 'forbidden' }
  }

  return {
    kind: 'ok',
    project: {
      id: project.id,
      orgId: project.orgId,
      name: project.name,
      slug: project.slug,
      createdAt: project.createdAt,
    },
  }
}
