# Shiftproof

Created October 4, 2026 UTC for LovHack Season 3. A browser-only volunteer rota revision workspace. An organiser loads the previous and revised rota, sees gaps and double bookings, repairs an assignment, and exports a roster and individual change cards. All processing stays in the browser; no account or external runtime API is required.

## Acceptance

- Import two UTF-8 CSV files with `shift_id,task,start,end,required,volunteers`. Volunteers are separated by semicolons. Dates are `YYYY-MM-DDTHH:mm` in the event's local wall-clock time. The interface explains that it does not convert time zones.
- Compare by stable shift ID. Show added, removed, time/task/capacity changes and assignment changes with previous/revised evidence.
- Detect uncovered capacity and overlapping duties for the same volunteer, including cross-midnight intervals. Adjacent duties do not conflict.
- Edit revised assignments using people appearing in either rota, or add a name. Recompute gaps, conflicts and per-person notices immediately. Never automatically assign someone or claim availability.
- Preview and print volunteer-specific before/after cards. Download the repaired CSV and a portable JSON review. Any export visibly warns if issues remain.
- Ship a keyboard-accessible responsive UI with labelled synthetic demo data; empty/error states; reset confirmation; accessible status messages; no tracking/CDN requests.
- Cache app shell for offline use after first successful visit. Report storage failure without losing the in-memory review; export works even without local storage.
- Record repeatable browser E2E evidence, desktop/mobile screenshots and a 2–3 minute publicly viewable product demo.

## Failure cases to exercise before release

1. Unclosed/misplaced CSV quotes, embedded comma/newline, CRLF and UTF-8 BOM.
2. Missing/duplicate headers or IDs, noninteger capacity, impossible dates, end before start, zero-length intervals, excessive file size/row count, duplicate volunteer names.
3. Same volunteer overlapping different shifts; adjacent shifts; repeated names with case/space variations; missing coverage; shift deletion/addition; revised names absent from previous rota.
4. Failed imports preserve the current review. Untrusted names/tasks are rendered as text. CSV exports escape formula-leading cells. JSON imports never execute code and are validated with the same invariants.
5. CSV export/reimport round trip preserves assignments. Offline reload works. Storage denied/quota failure remains usable. Print output includes only the selected person's notices.
6. Keyboard focus remains usable after edits; controls fit a 390px viewport; reduced motion; visible labels/contrast; no silent destructive reset.

## Boundaries

This is an organiser review tool, not a scheduling optimiser or availability database. People must agree to any reassignment. All sample people and shifts are fictional. There are no claims of measured time savings, pilot users, clinical benefit or guaranteed impact. File data stays on the user's device. A saved local review can be cleared. It is not a multi-user service and cannot notify volunteers directly.
