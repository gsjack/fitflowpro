module.exports = {
  apps: [
    {
      name: 'fitflow-backend',
      cwd: './backend',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'fitflow-mobile',
      cwd: './mobile',
      script: 'npm',
      args: 'run dev',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};
