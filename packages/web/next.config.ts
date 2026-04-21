import type { NextConfig } from 'next'

const config: NextConfig = {
  transpilePackages: ['@argos/shared'],
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
}

export default config
