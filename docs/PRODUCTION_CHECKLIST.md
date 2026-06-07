# Production Checklist

- [ ] Configure Firebase service account via secret manager; do not use local fallback credentials.
- [ ] Set `NODE_ENV=production` and explicit `CORS_ALLOWED_ORIGINS`.
- [ ] Set rate limits and request/outbound timeouts for your expected traffic.
- [ ] Deploy backend to Cloud Run with min/max instances and concurrency tuned from load tests.
- [ ] Enable Cloud Run request logs, alerts, and uptime checks for `/health` and `/ready`.
- [ ] Enable Firestore backups, PITR, and retention policy.
- [ ] Verify CI green (frontend/backend build + dependency audit).
- [ ] Run smoke tests for login, save link, list links, delete link, export links.
- [ ] Confirm rollback version and on-call contact before each release.
