module.exports = {
  apps: [{
    name: 'auction-server',
    script: './server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      CLIENT_URL: 'https://ipl-auction-client-three.vercel.app'
    },
    // Auto-restart on crash
    autorestart: true,
    // Restart if using >500MB memory
    max_memory_restart: '500M',
    // Log files
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Don't restart if crashing too fast
    min_uptime: '10s',
    max_restarts: 5,
  }]
};
