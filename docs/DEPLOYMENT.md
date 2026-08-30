# Techno House — Deployment

## Target

Must be deployable to:
- VPS
- cloud VM
- container-based hosting
- compatible managed Node.js hosting

## Production components

- Next.js/Node runtime
- PostgreSQL
- reverse proxy such as Nginx
- HTTPS
- process manager or container runtime
- environment variables/secrets
- migrations
- backups
- logs
- health checks

## Deployment principles

- no hosting-vendor lock-in in core business logic
- separate development/staging/production environments
- never use production credentials locally
- never commit `.env` secrets
- maintain `.env.example`

## Production checklist

- build succeeds
- migrations verified
- environment variables verified
- HTTPS enabled
- security headers configured
- backups configured
- health check available
- logs monitored
- rollback procedure documented
