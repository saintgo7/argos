import 'server-only'

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * 라우트 핸들러용 에러 처리 헬퍼.
 * packages/api/src/middleware/error.ts와 동일한 응답 shape.
 */
export function handleRouteError(err: unknown): NextResponse {
  console.error('Error:', err)

  // instanceof는 @argos/shared와 web이 번들에서 서로 다른 zod 인스턴스를 참조할 때 실패 — name 기반 duck-typing으로 보강
  const isZodError =
    err instanceof ZodError ||
    (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'ZodError')

  if (isZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation error',
          details: (err as ZodError).errors,
        },
      },
      { status: 400 }
    )
  }

  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
    { status: 500 }
  )
}
