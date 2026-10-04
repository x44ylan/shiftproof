# Browser verification

Passed **69 browser E2E checks** on **October 4, 2026, 17:32:58 UTC**. The machine-readable result is [evidence/verification.json](evidence/verification.json).

The proof exercises the real interface and file uploads/downloads, rather than calling the comparison engine as a unit test. It covers assignment repairs, malformed CSV preservation, CSV/JSON round trips, quoted cells, impossible dates, cross-midnight and adjacent duties, safe text and spreadsheet exports, individual print privacy, local persistence, actual offline reload, denied storage, keyboard controls and the 390px layout. No uncaught JavaScript errors or external tracking/CDN requests were observed in those workflows.

To repeat: serve this directory on localhost port 8211 with Python, then run `./verify.sh` with Playwright CLI and an installed Playwright Chromium browser. Artifacts go to `~/services/shiftproof/artifacts`. This verifies browser behaviour with fictional fixtures, not real volunteer outcomes.

The recorded walkthrough lasts approximately 148 seconds and exercises a real repair, selected-card print/PDF output, exports, reopening JSON and offline reload. Its record is [evidence/demo.json](evidence/demo.json); watch [demo.html](demo.html).

The product has no claims of measured impact or production pilots. Time-zone conversion, travel buffers, qualifications, actual availability and multi-user delivery remain outside its scope.
