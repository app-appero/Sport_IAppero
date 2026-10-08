# Inventario OpenAPI distribuite

Acquisito il 7 ottobre 2026. Tutte le route nelle specifiche, incluse quelle amministrative. Questo elenco NON autorizza il BFF a chiamarle. Usare soltanto la allowlist dei documenti 03/04. Gli snapshot completi contengono schemi, query e security requirements.


## soccer

| Metodo | Path | Operazione | Security dichiarata |
|---|---|---|---|
| GET | `/` | Index | Nessuna nello schema |
| GET | `/health` | Health | Nessuna nello schema |
| GET | `/health/database` | Health Database | Nessuna nello schema |
| GET | `/markets` | Markets | Nessuna nello schema |
| GET | `/dashboard/overview` | Dashboard Overview | Nessuna nello schema |
| GET | `/dashboard/bundle` | Dashboard Bundle | Nessuna nello schema |
| GET | `/dashboard/available-dates` | Dashboard Available Dates | Nessuna nello schema |
| GET | `/dashboard/live` | Dashboard Live | Nessuna nello schema |
| GET | `/dashboard/day` | Dashboard Day | Nessuna nello schema |
| GET | `/dashboard/match/{fixture_id}` | Dashboard Match Detail | Nessuna nello schema |
| POST | `/dashboard/matches/{fixture_id}/recompute-predictions` | Dashboard Match Recompute Predictions | Nessuna nello schema |
| GET | `/dashboard/match/{fixture_id}/consensus` | Dashboard Match Consensus | Nessuna nello schema |
| GET | `/dashboard/match/{fixture_id}/oracle-detail` | Dashboard Match Oracle Detail | Nessuna nello schema |
| POST | `/predict/{market}` | Predict | Nessuna nello schema |
| POST | `/jobs/import` | Trigger Import | Nessuna nello schema |
| POST | `/jobs/today-update` | Trigger Today Update | Nessuna nello schema |
| POST | `/jobs/live-sync` | Trigger Live Sync | Nessuna nello schema |
| GET | `/live/fixtures` | Live Fixtures | Nessuna nello schema |
| GET | `/live/fixtures/{fixture_id}/events` | Live Fixture Events | Nessuna nello schema |
| GET | `/live/fixtures/{fixture_id}/statistics` | Live Fixture Statistics | Nessuna nello schema |
| POST | `/jobs/future-sync` | Trigger Future Sync | Nessuna nello schema |
| POST | `/jobs/daily-refresh` | Trigger Daily Refresh | Nessuna nello schema |
| POST | `/jobs/prediction-snapshot-refresh` | Trigger Prediction Snapshot Refresh | Nessuna nello schema |
| POST | `/jobs/settlement` | Trigger Settlement | Nessuna nello schema |
| GET | `/settlement/overview` | Settlement Overview | Nessuna nello schema |
| POST | `/jobs/retrain` | Trigger Retrain | Nessuna nello schema |
| GET | `/metrics/{market}` | Metrics | Nessuna nello schema |
| GET | `/metrics/summary` | Metrics Summary | Nessuna nello schema |
| GET | `/models/legend` | Model Legend | Nessuna nello schema |
| GET | `/models/diagnostics` | Model Diagnostics | Nessuna nello schema |
| GET | `/models/{market}/registry` | Model Registry Overview | Nessuna nello schema |
| GET | `/models/{market}/promotion/evaluate` | Evaluate Model Promotion | Nessuna nello schema |
| POST | `/models/{market}/promote` | Promote Model | Nessuna nello schema |
| POST | `/models/{market}/rollback` | Rollback Model | Nessuna nello schema |
| GET | `/models/{market}/promotion-history` | Model Promotion History | Nessuna nello schema |
| POST | `/jobs/data-quality-report` | Trigger Data Quality Report | Nessuna nello schema |
| POST | `/jobs/official-capture` | Trigger Official Capture | Nessuna nello schema |
| POST | `/jobs/team-rating-refresh` | Trigger Team Rating Refresh | Nessuna nello schema |
| POST | `/jobs/model-consensus-refresh` | Trigger Model Consensus Refresh | Nessuna nello schema |
| GET | `/data/quality` | Data Quality | Nessuna nello schema |
| GET | `/odds/snapshots/{fixture_id}` | Odds Snapshots | Nessuna nello schema |
| GET | `/jobs/history` | Jobs History | Nessuna nello schema |
| GET | `/jobs/{job_id}` | Job Status | Nessuna nello schema |
| GET | `/predictions/log` | Predictions Log | Nessuna nello schema |
| POST | `/predictions/ledger` | Log Prediction Ledger | Nessuna nello schema |
| GET | `/predictions/ledger` | List Prediction Ledger | Nessuna nello schema |
| GET | `/predictions/ledger/fixture/{fixture_id}` | List Prediction Ledger For Fixture | Nessuna nello schema |
| POST | `/predictions/ledger/settle` | Settle Prediction Ledger | Nessuna nello schema |
| GET | `/predictions/ledger/pnl` | Prediction Ledger Pnl | Nessuna nello schema |
| GET | `/predictions/official/performance` | Official Prediction Performance | Nessuna nello schema |
| GET | `/predictions/official/plays` | Official Prediction Plays | Nessuna nello schema |
| GET | `/predictions/official/clv` | Official Prediction Clv | Nessuna nello schema |
| GET | `/predictions/official/clv/{id_prediction}` | Official Prediction Clv Detail | Nessuna nello schema |
| GET | `/betslip/pool` | Betslip Pool | Nessuna nello schema |
| GET | `/betslip/generate` | Betslip Generate | Nessuna nello schema |
| POST | `/betslip/generate/snapshot` | Betslip Generate Snapshot | Nessuna nello schema |
| GET | `/betslip/proposals` | Betslip Saved Proposals | Nessuna nello schema |
| GET | `/betslip/official` | Betslip Official | Nessuna nello schema |
| GET | `/betslip/official/statistics` | Betslip Official Statistics | Nessuna nello schema |
| GET | `/betting/statistics` | Betting Statistics | Nessuna nello schema |
| GET | `/monitoring/overview` | Monitoring Overview | Nessuna nello schema |
| GET | `/monitoring/alerts` | Monitoring Alerts | Nessuna nello schema |
| GET | `/settings/jobs` | Get Settings Jobs | Nessuna nello schema |
| POST | `/settings/jobs` | Post Settings Jobs | Nessuna nello schema |
| GET | `/settings/isolated-markets` | Get Settings Isolated Markets | Nessuna nello schema |
| POST | `/settings/isolated-markets` | Post Settings Isolated Markets | Nessuna nello schema |
| PUT | `/settings/jobs/{job_id}/schedule` | Put Settings Job Schedule | Nessuna nello schema |
| DELETE | `/settings/jobs/{job_id}/schedule` | Delete Settings Job Schedule | Nessuna nello schema |
| GET | `/settings/quota` | Get Settings Quota | Nessuna nello schema |
| POST | `/settings/quota/refresh` | Post Settings Quota Refresh | Nessuna nello schema |

## tennis

| Metodo | Path | Operazione | Security dichiarata |
|---|---|---|---|
| GET | `/health` | Health | Nessuna nello schema |
| GET | `/ready` | Ready | Nessuna nello schema |
| GET | `/deps` | Dependencies | Nessuna nello schema |
| GET | `/metrics` | Metrics | Nessuna nello schema |
| GET | `/metrics.json` | Metrics Json | Nessuna nello schema |
| POST | `/api/auth/login` | Login | Nessuna nello schema |
| GET | `/api/auth/me` | Read Session | HTTPBearer |
| POST | `/api/auth/logout` | Logout | HTTPBearer |
| GET | `/api/imports/status` | Read Import Status | HTTPBearer |
| POST | `/api/imports/refresh` | Refresh Upcoming Matches | HTTPBearer |
| POST | `/api/imports/fixtures` | Import Completed Fixtures | HTTPBearer |
| GET | `/api/next-fixtures` | Read Next Fixtures | HTTPBearer / APIKeyHeader |
| GET | `/api/next-fixtures/predictions` | Read Next Fixtures Predictions | HTTPBearer / APIKeyHeader |
| GET | `/api/predictions/stats/daily` | Read Daily Prediction Stats | HTTPBearer |
| GET | `/api/predictions/stats/summary` | Read Prediction Summary | HTTPBearer / APIKeyHeader |
| GET | `/api/betting-slips/daily` | Read Daily Betting Slips | HTTPBearer / APIKeyHeader |
| POST | `/api/betting-slips/daily` | Generate Daily Betting Slips | HTTPBearer |
| GET | `/api/betting-slips/daily/image.png` | Download Daily Betting Slip Image | HTTPBearer |
| GET | `/api/betting-slips/daily/images.zip` | Download Daily Betting Slip Images Zip | HTTPBearer |
| GET | `/api/betting-slips/calendar` | Read Betting Slip Calendar | HTTPBearer |
| POST | `/api/betting-slips/refresh` | Refresh Daily Betting Slips | HTTPBearer |
| GET | `/api/betting-slips/stats` | Read Betting Slip Stats | HTTPBearer |
| GET | `/api/betting-slips/stats/by-model` | Read Betting Slip Stats By Model | HTTPBearer / APIKeyHeader |
| GET | `/api/single-match-value` | Read Single Match Value Analysis | HTTPBearer / APIKeyHeader |
| POST | `/api/global-update` | Trigger Global Update | HTTPBearer |
| GET | `/api/global-update/status` | Read Global Update Status | HTTPBearer |
| POST | `/api/global-update/{run_id}/cancel` | Cancel Global Update Run | HTTPBearer |
| GET | `/api/global-update/latest` | Read Latest Global Update | HTTPBearer |
| GET | `/api/global-update/{run_id}` | Read Global Update Run | HTTPBearer |
| GET | `/api/global-update/{run_id}/report` | Read Global Update Report | HTTPBearer |
| GET | `/api/models-versions/results` | Read Models Versions Results | HTTPBearer / APIKeyHeader |
| GET | `/api/telegram/events` | Read Telegram Events | HTTPBearer |
| GET | `/api/telegram/stats` | Read Telegram Stats | HTTPBearer |
| GET | `/api/telegram/users` | Search Telegram Users | HTTPBearer |
| POST | `/api/telegram/users` | Create Telegram User Invite | HTTPBearer |
| GET | `/api/telegram/users/{telegram_user_id}` | Read Telegram User | HTTPBearer |
| POST | `/api/telegram/users/{telegram_user_id}/activate` | Activate User | HTTPBearer |
| POST | `/api/telegram/users/{telegram_user_id}/suspend` | Suspend User | HTTPBearer |
| POST | `/api/telegram/users/{telegram_user_id}/block` | Block User | HTTPBearer |
| GET | `/api/telegram/feedback` | Search Telegram Feedback | HTTPBearer |
| GET | `/api/telegram/feedback/{feedback_id}` | Read Telegram Feedback | HTTPBearer |
| PATCH | `/api/telegram/feedback/{feedback_id}` | Patch Telegram Feedback Status | HTTPBearer |
| POST | `/api/payments/checkout` | Create Checkout Session | HTTPBearer / APIKeyHeader |
| POST | `/api/payments/webhook/stripe` | Stripe Webhook | Nessuna nello schema |
| POST | `/api/published-predictions` | Create Published Prediction | HTTPBearer |
| GET | `/api/published-predictions` | Read Published Predictions | HTTPBearer |
| GET | `/api/published-predictions/by-publication/{publication_id}` | Read Publication Versions | HTTPBearer |
| GET | `/api/published-predictions/stats` | Read Published Live Stats | HTTPBearer |
| GET | `/api/published-predictions/{prediction_id}` | Read Published Prediction | HTTPBearer |
| POST | `/api/published-predictions/{prediction_id}/corrections` | Create Published Prediction Correction | HTTPBearer |
| POST | `/api/prematch-odds-snapshots` | Create Prematch Odds Snapshot | HTTPBearer |
| GET | `/api/prematch-odds-snapshots` | Read Prematch Odds Snapshots | HTTPBearer |
| POST | `/api/prematch-odds-snapshots/from-payload` | Create Prematch Odds Snapshots From Payload | HTTPBearer |
| POST | `/api/prematch-odds-snapshots/from-fixture/{event_key}` | Create Prematch Odds Snapshots From Fixture | HTTPBearer |
| GET | `/api/prematch-odds-snapshots/{snapshot_id}` | Read Prematch Odds Snapshot | HTTPBearer |
| GET | `/api/live-beta-dashboard` | Read Live Beta Dashboard | HTTPBearer |
| GET | `/api/weekly-beta-reports` | List Reports | HTTPBearer |
| GET | `/api/weekly-beta-reports/latest` | Read Latest Report | HTTPBearer |
| POST | `/api/weekly-beta-reports/generate` | Generate Report | HTTPBearer |
| GET | `/api/weekly-beta-reports/{report_id}` | Read Report | HTTPBearer |
| GET | `/api/walk-forward` | List Runs | HTTPBearer |
| GET | `/api/walk-forward/latest` | Read Latest Run | HTTPBearer |
| POST | `/api/walk-forward/runs` | Trigger Run | HTTPBearer |
| GET | `/api/walk-forward/runs/{run_id}` | Read Run | HTTPBearer |
| POST | `/api/walk-forward/runs/{run_id}/cancel` | Cancel Run | HTTPBearer |
| GET | `/api/calibration` | List Runs | HTTPBearer |
| GET | `/api/calibration/latest` | Read Latest Run | HTTPBearer |
| POST | `/api/calibration/runs` | Trigger Run | HTTPBearer |
| GET | `/api/calibration/runs/{run_id}` | Read Run | HTTPBearer |
| POST | `/api/calibration/runs/{run_id}/cancel` | Cancel Run | HTTPBearer |
| GET | `/api/public-model-registry/active` | Read Active Public Model | HTTPBearer / APIKeyHeader |
| GET | `/api/public-model-registry` | List Entries | HTTPBearer |
| POST | `/api/public-model-registry/candidates` | Create Candidate | HTTPBearer |
| POST | `/api/public-model-registry/entries/{entry_id}/activate` | Activate Entry | HTTPBearer |
| POST | `/api/public-model-registry/rollback` | Rollback Active | HTTPBearer |
| GET | `/api/probability-bands` | Read Probability Band Analysis | HTTPBearer |
| GET | `/api/segment-roi` | Read Segment Roi Analysis | HTTPBearer |
| GET | `/api/slip-shape-trial` | Read Slip Shape Trial | HTTPBearer |
| GET | `/api/settings/providers/api-tennis` | Read Api Tennis Settings | HTTPBearer |
| POST | `/api/settings/providers/api-tennis/test` | Test Api Tennis Connection | HTTPBearer |
| PATCH | `/api/settings/providers/api-tennis/key` | Update Api Tennis Key | HTTPBearer |
| GET | `/api/settings/scheduled-jobs` | Read Scheduled Jobs | HTTPBearer |
| PATCH | `/api/settings/scheduled-jobs/{job_key}` | Patch Scheduled Job | HTTPBearer |
| GET | `/api/ops/checks` | Get Ops Checks | HTTPBearer |
| GET | `/api/subscriptions/dashboard/summary` | Read Dashboard Summary | HTTPBearer |
| GET | `/api/subscriptions/dashboard/feature-flags` | Read Dashboard Feature Flags | HTTPBearer |
| PATCH | `/api/subscriptions/dashboard/feature-flags/{feature_key}` | Update Dashboard Feature Flag | HTTPBearer |
| GET | `/api/subscriptions/dashboard/users` | Read Dashboard Users | HTTPBearer |
| GET | `/api/subscriptions/dashboard/events` | Read Dashboard Events | HTTPBearer |
| GET | `/api/subscriptions/dashboard/export.csv` | Export Dashboard Csv | HTTPBearer |
| POST | `/api/subscriptions/dashboard/subscriptions/{subscription_id}/suspend` | Suspend Dashboard Subscription | HTTPBearer |
| POST | `/api/subscriptions/dashboard/subscriptions/{subscription_id}/resume` | Resume Dashboard Subscription | HTTPBearer |
| POST | `/api/subscriptions/dashboard/subscriptions/{subscription_id}/cancel` | Cancel Dashboard Subscription | HTTPBearer |
