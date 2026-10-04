# A clearer volunteer handoff

Primary Graphiques theme: **Social Impact & Community Innovation**.

A student society or community-event organiser revises a rota after a change in the plan. The spreadsheet can show the new assignments but leaves the organiser to discover consequences and explain them individually. NCVO's guidance supports timely updates, accessible processes and clear responsibilities; it does not establish the frequency or cost of this particular problem.

## Proposed service

Keep the existing rota as the input. The organiser reviews the previous and revised versions in a local workspace, resolves visible staffing issues with the affected people's agreement, and gives each person a short before/after card in their preferred channel. No new volunteer accounts are required. Printed cards support people who cannot or do not want to use a shared online tool.

The prototype implements the review interaction: validated imports, evidence of changes, uncovered-headcount and overlap checks, manual assignment repair, personal printable notices and portable exports. It does not notify anyone or coordinate concurrent organisers. All demonstration data is fictional.

## Practical implementation

Use stable shift IDs and distinct volunteer labels in an existing spreadsheet. One organiser owns the revision; people confirm changes before a final plan is shared. The exported CSV returns to the existing workflow. Data stays on the organiser's device, with clearing for shared devices. Static HTTPS hosting and modern browsers suffice; there is no per-review inference or backend service.

The intended contribution is a review and communication step between a revised spreadsheet and the people affected. It makes consequences visible and creates a personal explanation. This is not a claim that no scheduling product has similar features. It fits a small event's existing files rather than requiring migration to another platform.

## Risks and proposed validation

Same-name volunteers need distinct labels. The tool knows neither qualifications nor actual availability. Time zones, daylight-saving transitions and travel buffers need organiser attention. Saved browser data and exported files need care on shared devices.

Proposed validation: ask organisers to review equivalent revisions using their current method and this prototype. Compare correctly identified issues and volunteers' comprehension of the cards; inspect accessibility and consent practices. This study has not been conducted. There are no pilot users, fabricated testimonials or claimed savings.

Sources are in [research.md](research.md). The runnable prototype and recorded walkthrough support this service concept.
