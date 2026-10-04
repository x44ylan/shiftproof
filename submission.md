# Shiftproof

## Tagline

Catch rota gaps. Share only what changed.

## Inspiration

A small edit to a volunteer rota can change more than one cell. Move the welcome desk by half an hour and someone may now have two duties at once. Remove an assignment and the organiser needs to notice the gap, find a suitable replacement and explain the change clearly.

NCVO's volunteer guidance recommends timely, accessible communication about important changes. Shiftproof explores a practical way to support that: review the consequences first, then produce a short personal notice.

## What it does

An organiser loads the previous and revised CSV rotas. Shiftproof compares stable shift IDs, shows added and removed duties, and highlights changes to times, tasks, capacity and assignments. It detects missing headcount and overlapping duties, including shifts crossing midnight.

The organiser edits assignments and immediately sees the consequences. A person with no conflicting loaded duty still needs to agree to the reassignment. The app never claims to know real availability.

Individual cards show just that person's before-and-after duties. The organiser can print a card, export a repaired CSV or save a portable review. Unresolved staffing issues remain visible when sharing.

## How it was built

Plain HTML, CSS and JavaScript. Parsing and comparison run on the device. A service worker caches the app after the first visit, so reviewing a rota can continue without a connection. There is no runtime AI, external service, account, backend or paid compute.

OpenAI Codex assisted with the idea, code, design, research, documentation and browser verification. All product code and the fictional demonstration dataset were created on October 4, 2026 UTC. No pre-existing project code or templates were used. Primary guidance is linked in the public repository.

## Challenges

Reliable file handling matters more than a happy-path animation. CSVs can contain quoted commas, reordered headers, impossible dates and duplicate IDs. Unsafe strings need to remain text, exported spreadsheet cells need protection, and failed imports must preserve the current review.

The other design challenge was communicating limits: loaded rota data is not an availability database, adjacent shifts may need travel time, and a drafted notice is not a sent message.

## What was learned

The useful unit of work is a whole handoff: identify a change, understand its consequences, review a repair and explain it to the affected person. A small graphical tool can make that loop understandable without a model or cloud integration.

## What's next

Test the workflow with actual volunteer organisers before making impact claims. Explore role qualifications and travel buffers only if real users need them. The current prototype uses fictional data and has no reported pilots or measured time savings.
