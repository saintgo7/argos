/**
 * 브라우저(클라이언트 컴포넌트)에서 동일 Next.js 앱의 라우트 핸들러를 호출하는 헬퍼.
 * 라우트가 같은 origin에 있으므로 상대경로 fetch면 충분하다.
 */
export async function apiGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(path, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`API request failed: ${res.status} ${res.statusText}`)
  }

  return res.json()
}
