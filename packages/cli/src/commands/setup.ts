import { join } from 'path'
import chalk from 'chalk'
import ora from 'ora'
import { DEFAULT_API_URL, normalizeApiUrl } from '../lib/config.js'
import type { CreateProjectResponse } from '@argos/shared'
import type { CommandFactory } from '../deps.js'

interface SetupCommandOptions {
  token?: string
  apiUrl?: string
}

/**
 * 비대화형 초기 설정.
 * 웹 가입 직후 발급된 onboard token을 받아 로그인 → 프로젝트 생성 → hook 설치까지 한 번에.
 * 사용자 입력 일체 없음.
 */
export const makeSetupCommand: CommandFactory<SetupCommandOptions> =
  (deps) => async (options) => {
    if (!options.token) {
      console.error(chalk.red('✗ --token 인자가 필요합니다.'))
      console.error('예: argos setup --token=argos_onb_XXXX')
      process.exit(1)
    }

    const customApiUrl = normalizeApiUrl(options.apiUrl)
    const effectiveApiUrl = customApiUrl ?? DEFAULT_API_URL

    console.log(chalk.bold('Argos 초기 설정'))
    console.log()

    // Step 1: onboard token 교환
    const loginSpinner = ora('로그인 중...').start()
    let exchange
    try {
      exchange = await deps.api.exchange(options.token, effectiveApiUrl)
      loginSpinner.succeed(chalk.green(`✓ 로그인 완료 (${exchange.user.email})`))
    } catch (err) {
      loginSpinner.fail(chalk.red('✗ 로그인 실패'))
      console.error(err instanceof Error ? err.message : String(err))
      console.error(chalk.yellow('토큰이 만료되었거나 이미 사용되었을 수 있습니다. 웹에서 새 프롬프트를 발급받으세요.'))
      process.exit(1)
    }

    deps.config.write({
      token: exchange.token,
      userId: exchange.user.id,
      email: exchange.user.email,
      ...(customApiUrl && { apiUrl: customApiUrl }),
    })

    // Step 2: 프로젝트 생성 (cwd 디렉터리명 기반). org가 없으면 adapter에서 자동 생성.
    const projectName = deps.cwd().split('/').pop() || 'my-project'
    const projectSpinner = ora('프로젝트 생성 중...').start()

    let projectResponse: CreateProjectResponse
    try {
      projectResponse = await deps.api.createProject(projectName, exchange.token, effectiveApiUrl)
      projectSpinner.succeed(chalk.green(`✓ 프로젝트 생성: ${projectResponse.projectName}`))
      console.log(`  조직: ${projectResponse.orgName}`)
    } catch (err) {
      projectSpinner.fail(chalk.red('✗ 프로젝트 생성 실패'))
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }

    // Step 3: project config 기록
    deps.project.write({
      projectId: projectResponse.projectId,
      orgId: projectResponse.orgId,
      orgSlug: projectResponse.orgSlug,
      orgName: projectResponse.orgName,
      projectName: projectResponse.projectName,
      ...(customApiUrl && { apiUrl: customApiUrl }),
    })
    console.log(chalk.green('✓ .argos/project.json 작성'))

    // Step 4: Claude Code hook 설치
    const settingsPath = join(deps.cwd(), '.claude', 'settings.json')
    const hookResult = deps.hooks.inject(settingsPath)
    if (hookResult === 'injected') {
      console.log(chalk.green('✓ Claude Code hooks 설치 완료'))
    } else {
      console.log(chalk.yellow('✓ Claude Code hooks 이미 설치됨'))
    }

    console.log()
    console.log(chalk.bold.green('✓ 설정 완료!'))
    console.log()
    console.log('다음 단계:')
    console.log('  git add .argos/project.json .claude/settings.json')
    console.log('  git commit -m "chore: add argos tracking"')
  }
