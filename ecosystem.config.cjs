module.exports = {
  apps: [{
    name: 'baystats-api',
    script: 'node',
    args: '--max-old-space-size=256 --import tsx/esm server/index.ts',
    cwd: '/home/dev/_prod/baystats.com',
    env_file: '/home/dev/_prod/baystats.com/.env',
    interpreter: 'none',
    restart_delay: 5000,
    max_restarts: 10,
  }]
};
