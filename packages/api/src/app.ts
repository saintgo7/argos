import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { errorHandler } from '@/middleware/error'
import health from '@/routes/health'
import auth from '@/routes/auth'
import orgs from '@/routes/orgs'
import projects from '@/routes/projects'
import events from '@/routes/events'
import dashboard from '@/routes/dashboard'

const app = new Hono()

app.use('*', cors({ origin: '*' }))
app.use('*', logger())
app.onError((err, c) => {
  // cors() middleware post-processing doesn't run when a handler throws,
  // so we manually add CORS headers here to prevent browser CORS errors on 5xx.
  c.header('Access-Control-Allow-Origin', '*')
  return errorHandler(err, c)
})

app.route('/health', health)
app.route('/api/auth', auth)
app.route('/api/orgs', orgs)
app.route('/api/projects', projects)
app.route('/api/projects/:projectId/dashboard', dashboard)
app.route('/api/events', events)

export default app
