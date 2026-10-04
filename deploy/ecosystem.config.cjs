/**
 * PM2 process definition for Techno House.
 *
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save && pm2 startup          # restart on reboot (run the command it prints)
 *
 * Configuration (DATABASE_URL, SESSION_JWT_SECRET, ADMIN_LOGIN_SLUG, ...) is
 * NOT set here. Next.js reads .env.local from the app directory, so put the
 * values in /var/www/techno-house/current/.env.local (gitignored, untouched by
 * checkouts; see docs/DEPLOY_VPS_RUNBOOK.md). The same file also feeds the
 * `npm run ...` maintenance scripts, which load .env.local the same way.
 *
 * Bound to 127.0.0.1: Nginx is the only thing that should talk to Node.
 */
const APP_DIR = process.env.APP_DIR || "/var/www/techno-house/current";
const LOG_DIR = process.env.LOG_DIR || "/var/log/techno-house";

module.exports = {
  apps: [
    {
      name: "techno-house",
      cwd: APP_DIR,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      env: { NODE_ENV: "production" },
      // One process: the app keeps a small (max 5) Postgres pool per process,
      // and nothing here is sticky-session aware. Scale vertically first.
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
      kill_timeout: 10000,
      out_file: `${LOG_DIR}/out.log`,
      error_file: `${LOG_DIR}/error.log`,
      merge_logs: true,
      time: true,
    },
  ],
};
