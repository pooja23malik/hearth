# TODOS

## Post-v1

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

### Create DESIGN.md
**What:** Extract design tokens and visual identity decisions into a proper DESIGN.md file.
**Why:** Design tokens (colors, spacing, radii, typography) are currently embedded in the implementation plan. Before building v2 UI (AI Time Coach chat interface, weekly dashboard), these should be centralized in DESIGN.md to ensure visual consistency across features.
**Effort:** human: ~2 hours / CC: ~15 min (or run `/design-consultation` for a comprehensive version)
**How:** Extract the design tokens from the implementation plan, add component patterns, document the "warm minimal" visual identity, and include the responsive breakpoints and accessibility requirements.
**Priority:** Do before starting v2 UI work.

### Task templates for cold-start
**What:** Starter task templates ("Home Maintenance", "Health & Wellness", "Errands") that pre-fill 10-15 common tasks with sensible recurrence rules and durations.
**Why:** When a family creates a new board, they face an empty list and have to manually add every task. Templates solve the cold-start problem — one tap to seed the board with common tasks.
**Effort:** human: ~2 hours / CC: ~10 min
**How:** A "Start with templates" option during board creation. Templates are hardcoded JSON (not a database feature). Each template includes title, category, recurrence_rule, estimated_duration_minutes, and preferred_time_of_day.
**Priority:** Nice-to-have — can add anytime post-v1.
