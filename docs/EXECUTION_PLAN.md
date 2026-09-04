# EXECUTION PLAN: BayStats Revenue Activation

Generated: 2026-02-25
Total packets: 9
Parallel groups: 6 (groups 5-6 DEFERRED behind revenue gate)
Active execution groups: 4

---

## Parallel Group 1 (Independent -- start immediately, run together)

- PACKET_0: Environment + Setup -- dependencies: none
- PACKET_1_1: F001 Location Bug Fix -- dependencies: none

Estimated time: 45-60 min (parallel)
File conflict check: PACKET_0 (package.json, access.ts, .env.example, netlify.toml) vs PACKET_1_1 (DashboardV2.tsx, useBriefingData.ts) -- NO CONFLICTS. Safe to run parallel.

GROUP 1 GATE: Both complete + npm run build passes + npm run dev starts both servers.

---

## Parallel Group 2 (After Group 1 complete -- run together)

- PACKET_2_1: F002 Backend Gating -- depends on: PACKET_0
- PACKET_2_2: F002 Frontend Paywall -- depends on: PACKET_0, PACKET_1_1

Estimated time: 90-120 min (parallel)
File conflict check: PACKET_2_1 (weather.ts, clearance.ts, tides.ts, currents.ts, sunmoon.ts) vs PACKET_2_2 (RegionalPaywallBanner.tsx NEW, DashboardV2.tsx) -- NO CONFLICTS. Safe to run parallel.

GROUP 2 GATE: Free location (rodney-bay) returns 200 no-auth. Non-free location (le-marin) returns 402 no-auth. Dashboard shows RegionalPaywallBanner for non-free location.

---

## Parallel Group 3 (After Group 2 complete -- run together)

- PACKET_3_1: F003 Stripe Backend -- depends on: PACKET_2_1
- PACKET_3_2: F003 Subscribe Pages -- depends on: PACKET_2_2

Estimated time: 120-180 min (parallel)
File conflict check: PACKET_3_1 (subscription-checkout.ts NEW, subscription-portal.ts NEW, server/index.ts, 024.sql NEW) vs PACKET_3_2 (Subscribe.tsx NEW, SubscribeSuccess.tsx NEW, App.tsx) -- NO CONFLICTS. Safe to run parallel.

GROUP 3 GATE: Stripe CLI checkout.session.completed -> user.tier='pro' in Supabase. /subscribe page shows Annual selected by default. Clicking Subscribe opens Stripe Checkout.

---

## Parallel Group 4 (After Group 3 complete -- run sequentially)

- PACKET_4_1: F003+F004 Session + Account -- depends on: PACKET_3_1, PACKET_3_2

Estimated time: 90-120 min (sequential -- only packet in group)

GROUP 4 GATE (Revenue Gate): Full flow works end-to-end:
  free user -> selects Martinique -> RegionalPaywallBanner -> Subscribe ($69/yr) -> Stripe Checkout -> success -> dashboard with Martinique -> /account shows plan + billing date.

Deploy feat/revenue-v2 -> merge to main -> pm2 restart baystats-api -> npm run build + serve dist.
Confirm first paying subscriber in Stripe Dashboard before proceeding to Group 5.

---

## Parallel Group 5 (DEFERRED -- after revenue gate)

- PACKET_5_1: F005 UI Theme Foundation -- depends on: PACKET_4_1

STATUS: DEFERRED. Do not execute until first paying subscriber confirmed in production.

---

## Parallel Group 6 (DEFERRED -- after Group 5)

- PACKET_5_2: F005 Data Cards + Paywall Redesign -- depends on: PACKET_5_1

STATUS: DEFERRED.

---

## Execution Summary

Sequential estimate (groups 1-4): ~6-8 hours
Parallel estimate (groups 1-4): ~4-5 hours
Time savings with parallelization: ~35%

Deferred (groups 5-6): ~6-9 hours (execute after revenue confirmed)

---

## File Conflict Analysis

Group 1 PACKET_0 vs PACKET_1_1: No conflicts.
Group 2 PACKET_2_1 vs PACKET_2_2: No conflicts.
Group 3 PACKET_3_1 vs PACKET_3_2: WATCH -- both modify App.tsx (PACKET_3_2 adds routes, PACKET_3_1 does not touch App.tsx -- confirmed no conflict). PACKET_3_1 modifies server/index.ts; PACKET_3_2 does NOT touch server/index.ts -- no conflict.

Only potential conflict zone: if PACKET_3_1 and PACKET_3_2 both touch App.tsx. Check packet specs -- PACKET_3_1 does NOT modify App.tsx (server-side only). Safe.

---

## CLI Execution Commands

### Group 1 (parallel):
```bash
cd /home/dev/_prod/baystats.com
git checkout feat/revenue-v2

# Terminal 1:
claude --model claude-sonnet-4-6 -p "Read /home/dev/_prod/baystats.com/planning/EXE.md and BUILD_LOG.md. Execute PACKET_0 from ALL_PACKETS_COMPLETE.md. Commit when done and update BUILD_LOG.md." --dangerously-skip-permissions &

# Terminal 2:
claude --model claude-sonnet-4-6 -p "Read /home/dev/_prod/baystats.com/planning/EXE.md and BUILD_LOG.md. Execute PACKET_1_1 from ALL_PACKETS_COMPLETE.md. Commit when done and update BUILD_LOG.md." --dangerously-skip-permissions &

wait
echo "[OK] Group 1 complete"
```

### Group 2 (parallel):
```bash
claude --model claude-sonnet-4-6 -p "Read /home/dev/_prod/baystats.com/planning/EXE.md and BUILD_LOG.md. Execute PACKET_2_1 from ALL_PACKETS_COMPLETE.md. Commit when done and update BUILD_LOG.md." --dangerously-skip-permissions &

claude --model claude-sonnet-4-6 -p "Read /home/dev/_prod/baystats.com/planning/EXE.md and BUILD_LOG.md. Execute PACKET_2_2 from ALL_PACKETS_COMPLETE.md. Commit when done and update BUILD_LOG.md." --dangerously-skip-permissions &

wait
echo "[OK] Group 2 complete"
```

### Group 3 (parallel):
```bash
claude --model claude-sonnet-4-6 -p "Read /home/dev/_prod/baystats.com/planning/EXE.md and BUILD_LOG.md. Execute PACKET_3_1 from ALL_PACKETS_COMPLETE.md. Commit when done and update BUILD_LOG.md." --dangerously-skip-permissions &

claude --model claude-sonnet-4-6 -p "Read /home/dev/_prod/baystats.com/planning/EXE.md and BUILD_LOG.md. Execute PACKET_3_2 from ALL_PACKETS_COMPLETE.md. Commit when done and update BUILD_LOG.md." --dangerously-skip-permissions &

wait
echo "[OK] Group 3 complete"
```

### Group 4 (sequential):
```bash
claude --model claude-sonnet-4-6 -p "Read /home/dev/_prod/baystats.com/planning/EXE.md and BUILD_LOG.md. Execute PACKET_4_1 from ALL_PACKETS_COMPLETE.md. Commit when done and update BUILD_LOG.md." --dangerously-skip-permissions
echo "[OK] Group 4 complete -- revenue gate: confirm first subscriber before Groups 5-6"
```

---

## Monitoring

```bash
# Watch git log during parallel execution:
watch -n 10 "git -C /home/dev/_prod/baystats.com log --oneline -10"

# Watch BUILD_LOG for updates:
tail -f /home/dev/_prod/baystats.com/planning/BUILD_LOG.md
```

---

## VPS Deploy After Group 4 (feat/revenue-v2 -> main)

```bash
# 1. Merge branch
git -C /home/dev/_prod/baystats.com checkout main
git -C /home/dev/_prod/baystats.com merge feat/revenue-v2

# 2. Build frontend
cd /home/dev/_prod/baystats.com && npm run build

# 3. Restart API server
pm2 restart baystats-api

# 4. Verify
pm2 status
curl http://localhost:3457/api/weather?location=rodney-bay
```

Before deploying: add production LS API key + webhook secret to .env.
Add webhook endpoint in LS dashboard -> Settings -> Webhooks: https://baystats.com/api/ls/webhook
Events: subscription_created, subscription_updated, subscription_cancelled, subscription_expired
