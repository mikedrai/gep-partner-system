module.exports = {
  apps: [
    {
      name: 'gep-backend',
      script: './backend/src/server.js',
      cwd: './',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4001  // Backend runs on 4001, nginx on 4000 proxies to it
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/backend-err.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
      node_args: '--max-old-space-size=1024'
    }
  ]
};