// APP_DIR overrides the deployed repo's path; it defaults to this file's
// own directory, so a checkout run in place needs no configuration.
const appDir = process.env.APP_DIR || __dirname;

module.exports = {
  apps: [{
    name: 'baystats-api',
    script: 'node',
    args: '--max-old-space-size=256 --import tsx/esm server/index.ts',
    cwd: appDir,
    env_file: `${appDir}/.env`,
    interpreter: 'none',
    restart_delay: 5000,
    max_restarts: 10,
    env: {
      NODE_ENV: 'production',
    },
  }]
};
