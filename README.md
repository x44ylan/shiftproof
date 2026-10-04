# Shiftproof

Compare two volunteer rotas, repair staffing issues, and print each person's changes. A small browser app for student societies, community events and volunteer organisers.

A welcome desk moving from 08:00–09:30 to 08:30–10:00 looks like one spreadsheet edit. For Alex, who starts setting up tables at 09:30, it creates a double booking. Shiftproof makes that consequence visible, alongside uncovered duties and individual before/after notices.

## Try it

[Live workspace](https://x44ylan.github.io/shiftproof/) · [Recorded walkthrough](https://x44ylan.github.io/shiftproof/demo.html)

Open the live app, use the clearly labelled fictional campus repair-day example, and follow **compare → repair → share**. The example contains a gap and an overlapping assignment. Replace Alex at setup with Jules, then add Alex to the donated-items shift. Check the updated review and print Alex's change card.

For a local copy:

```sh
python3 -m http.server 8211 --bind 127.0.0.1
```

Open `http://127.0.0.1:8211`. Serve over HTTPS or localhost to enable offline caching. There is no build step, runtime dependency, account, API key or paid resource. Offline use requires one successful visit first.

## Your files

Upload previous and revised UTF-8 CSVs with exactly these headers (order can vary):

```csv
shift_id,task,start,end,required,volunteers
welcome,Welcome desk,2026-11-07T08:30,2026-11-07T10:00,2,Alex;Mina
```

- Keep shift IDs stable across revisions.
- Separate volunteer names with semicolons. Matching ignores case and extra whitespace; names must identify people consistently. Two different people with the same name need distinct labels.
- Use `YYYY-MM-DDTHH:mm` in the event's local wall-clock time. The app does not convert time zones or resolve daylight-saving transitions.
- `required` is the minimum headcount, from 1 to 100. Coverage counts people, not qualifications or role suitability.
- Quoted CSV commas, newlines in task labels, CRLF and UTF-8 BOM are supported. Invalid files are rejected without replacing the current review.
- A shift ending at the same minute another starts is adjacent, rather than overlapping. Travel time is not modelled.

Exports include a revised CSV, a portable JSON review and printable individual change cards. CSV exports protect formula-leading cells for spreadsheet use. Treat exported files as personal data when they contain real volunteer names.

## Boundaries and privacy

Files are processed on the device. The app has no analytics, third-party fonts or runtime network service. A browser-saved review is local to this browser and can be cleared. Clear it after use on a shared device.

The app only knows the loaded rotas. A person with no overlapping loaded duty has **not** confirmed their availability. Organisers must obtain agreement before reassigning anyone. Shiftproof cannot deliver notices, coordinate multiple organisers or verify qualifications. Printable notices remain drafts when unresolved staffing issues exist.

All example people and duties are fictional. There are no claimed pilots, testimonials or measured savings.

## Build and validation

Created on October 4, 2026 UTC. Plain HTML/CSS/JavaScript with a service worker. AI-assisted coding, documentation and verification were used; no runtime AI model or generated scheduling recommendations are involved. No prior project code, template or dataset was copied into the product.

The acceptance conditions and failure cases were recorded before implementation in [spec.md](spec.md). Browser E2E verification is repeatable with `./verify.sh`; see the generated verification artifact for actual checks and results. Tests use fictional data only. MIT licensed.
