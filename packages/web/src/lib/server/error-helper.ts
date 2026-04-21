import 'server-only'

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * 라우트 핸들러용 에러 처리 헬퍼.
 * packages/api/src/middleware/error.ts와 동일한 응답 shape.
 */
export function handleRouteError(err: unknown): NextResponse {
  console.error('Error:', err)

  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation error',
          details: err.errors,
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
