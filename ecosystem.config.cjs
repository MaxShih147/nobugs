module.exports = {
  apps: [
    {
      name: 'nobugs-api',
      script: 'server/index.js',
      cwd: '/Users/max_server/repo_claude/nobugs',
      node_args: '--experimental-modules',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'nobugs-fe',
      script: 'node_modules/.bin/vite',
      cwd: '/Users/max_server/repo_claude/nobugs',
      env: {
        VITE_DATA_SOURCE: 'notion',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: 'nobugs-tunnel',
      script: '/opt/homebrew/bin/cloudflared',
      args: 'tunnel run --token eyJhIjoiMjcxMzI2NmY2ZWMwM2VkYzM4NWI2ZjcxNmMzOWUxOTgiLCJ0IjoiNDNjYWNiZmQtOTc3My00MTUxLThmNGYtZjlkMzA2N2FjMDQzIiwicyI6Ik5UUXdOMkl5WWpRdFpqQmtNeTAwTmpGbUxXRTRZelF0WmpKaVpEUm1aR0ZsTXpFMCJ9',
      cwd: '/Users/max_server/repo_claude/nobugs',
      interpreter: 'none',
      watch: false,
      autorestart: true,
      max_restarts: 10,
    },
  ],
};
