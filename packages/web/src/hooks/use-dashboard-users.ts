'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { apiGet } from '@/lib/api-client'
import type { PaginatedResult, UserStat } from '@argos/shared'

export function useDashboardUsers(
  projectId: string,
  from: string,
  to: string,
  page: number,
  pageSize: number,
  sort?: 'name' | 'tokens',
) {
  const { data: session } = useSession()

  const sortParam = sort === 'tokens' ? '&sort=tokens' : ''

  return useQuery({
    queryKey: ['dashboard', 'users', projectId, from, to, page, pageSize, sort ?? 'name'],
    queryFn: () =>
      apiGet<PaginatedResult<UserStat>>(
        `/api/projects/${projectId}/dashboard/users?from=${from}&to=${to}&page=${page}&pageSize=${pageSize}${sortParam}`,
        session?.argosToken ?? ''
      ),
    staleTime: 30_000,
    enabled: !!session?.argosToken,
    placeholderData: keepPreviousData,
  })
}
