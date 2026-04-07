# TODOS

## Post-v1

### Turbopack dev server crash (memory leak)
**What:** The Turbopack dev server crashes after ~2-3 minutes due to its async hook tracker leaking ~112K entries/second into a V8 Map (hard cap at 16.7M entries).
**Why:** Makes local development frustrating. The server needs constant restarts.
**Effort:** human: N/A (upstream bug) / CC: ~1 min (workaround)
**How:** Workaround: run `next dev --no-turbopack` to use webpack instead. Or set `NODE_OPTIONS='--max-old-space-size=8192'` to delay the crash. Real fix needs to come from Next.js/Turbopack upstream.
**Priority:** Workaround when it becomes annoying enough. Production (`next start`) is unaffected.

### Database backups
**What:** Add automated PostgreSQL backups via `pg_dump` cron job.
**Why:** The Docker named volume preserves data across restarts but doesn't protect against disk failure on the Ubuntu server. If the server dies, all task data is lost.
**Effort:** human: ~2 hours / CC: ~10 min
**How:** Add a backup container or cron job to `docker-compose.yml` that runs `pg_dump` daily and stores backups to a separate directory (ideally synced to another machine or the Mac Studio).
**Priority:** Do within 1 week of going live — before the family relies on the data.

### Member identity recovery
**What:** Allow members to "re-claim" their identity after clearing browser cookies.
**Why:** If a family member clears their browser data, they lose their cookie and get a new UUID when they re-select their name. Their old personal tasks become permanently inaccessible (the old memberId is severed). The UI warns about this, but it will eventually happen.
**Effort:** human: ~4 hours / CC: ~15 min
**How:** Board creator can confirm "yes, this is Pooja" which transfers the old member record to the new cookie. Requires a "claim identity" flow in Board Settings.
**Priority:** Solve when someone actually hits this — not blocking v1.

### ~~Create DESIGN.md~~ ✅ DONE (2026-04-05)
Created via `/design-consultation`. Includes Fraunces + DM Sans typography, warm teal palette, full component patterns, accessibility specs, and dark mode strategy.

### Expand values beyond 1:1 category mapping (v2)
**What:** Add more granular preset values (e.g., "Fitness", "Nutrition", "Cooking" as separate options) and expand the `TaskCategory` enum to support many-to-many value-category mapping.
**Why:** v1 is limited to 5 values mapping 1:1 to 5 categories. Families may want finer-grained values for more meaningful alignment tracking. The 1:1 constraint was chosen for v1 simplicity.
**Effort:** human: ~4 hours / CC: ~15 min
**How:** Expand `TaskCategory` enum (migration), re-introduce a `value_category_map` table for many-to-many mapping, update the digest engine to join through the mapping table, and expand the preset values list to 12-15 options.
**Priority:** After Gentle Mirror v1 is shipped and validated with real family data. Let usage patterns inform which granular values are needed.
**Depends on:** Gentle Mirror v1 complete.

### Task templates for cold-start
**What:** Starter task templates ("Home Maintenance", "Health & Wellness", "Errands") that pre-fill 10-15 common tasks with sensible recurrence rules and durations.
**Why:** When a family creates a new board, they face an empty list and have to manually add every task. Templates solve the cold-start problem — one tap to seed the board with common tasks.
**Effort:** human: ~2 hours / CC: ~10 min
**How:** A "Start with templates" option during board creation. Templates are hardcoded JSON (not a database feature). Each template includes title, category, recurrence_rule, estimated_duration_minutes, and preferred_time_of_day.
**Priority:** Nice-to-have — can add anytime post-v1.

### Weekly LLM summary paragraph
**What:** Add a warm, LLM-generated summary paragraph at the top of the weekly digest that narrates the whole week in one paragraph.
**Why:** The digest currently has individual elements (bars, cards, callouts) but no unified narrative. A summary paragraph like "A strong week for Pooja and Sukhi. The kitchen was spotless, but health tasks slipped for the second week..." would be the strongest "it knows us" moment.
**Effort:** human: ~2 hours / CC: ~10 min
**How:** One additional LLM call during digest generation with a summary prompt template. Stored in `digest_insights` with type "summary". Template fallback for when LLM is unavailable.
**Priority:** Add after Gentle Mirror v1 ships and LLM prompts are tuned. This builds on the existing LLM integration.
**Depends on:** Gentle Mirror v1 complete.
