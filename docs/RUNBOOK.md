# SortAi Runbook

## SLO Targets
- Availability: 99.9% monthly for backend API.
- p95 latency: < 1500ms for GET endpoints.
- Error rate: < 1% 5xx over 15 minutes.

## Alerts
- High 5xx rate (>2% for 10m)
- High p95 latency (>2s for 10m)
- Repeated upstream failures to Gemini/YouTube
- Rate-limit spikes (possible abuse)

## Incident Steps
1. Check `/health`, `/ready`, and `/metrics`.
2. Inspect Cloud Run logs by `x-request-id`.
3. Verify external dependencies (Gemini, YouTube, Firebase).
4. If regression suspected, roll back to last healthy revision.
5. Post incident summary with timeline and follow-up actions.

## Key Rotation
1. Rotate API keys in Secret Manager.
2. Redeploy backend revision.
3. Validate `/ready`.
4. Invalidate old keys.

## Backup / Restore
1. Enable automated Firestore backups.
2. Test restore to a staging project monthly.
3. Keep at least one documented restore drill result.
