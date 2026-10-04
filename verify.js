async page => {
  const base = 'http://127.0.0.1:8211/';
  const output = '../../services/shiftproof/artifacts';
  const checks = [];
  const errors = [];
  const requests = [];
  const check = (value, name) => { if (!value) throw new Error(name); checks.push(name); };
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  const count = async id => Number((await page.locator('#' + id).innerText()).match(/\d+/)?.[0]);
  // The CLI sandbox has no Node Buffer or filesystem API. Native browser Files
  // exercise the same input/change path as a chooser without an app test hook.
  async function upload(selector, text, name, mimeType = 'text/csv') {
    await page.locator(selector).evaluate((input, file) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([file.text], file.name, { type: file.mimeType }));
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, { text, name, mimeType });
    if (selector === '#review-file') await page.waitForFunction(() => document.querySelector('#review-file').value === '');
  }
  await page.addInitScript(() => {
    window.shiftproofExportEvidence = [];
    const createURL = URL.createObjectURL;
    URL.createObjectURL = function (blob) {
      if (blob instanceof Blob) blob.text().then(text => window.shiftproofExportEvidence.push(text));
      return createURL.call(this, blob);
    };
  });
  const header = 'shift_id,task,start,end,required,volunteers';
  const row = (id, task, start, end, required, people) => [id, task, start, end, required, people].join(',');
  const single = row('desk', 'Welcome desk', '2026-11-07T08:00', '2026-11-07T09:00', 1, 'Alex');
  const baseline = header + '\n' + single + '\n';
  async function importCSV(before, after) {
    await upload('#before-file', before, 'previous.csv');
    await upload('#after-file', after, 'revised.csv');
    await page.locator('#compare-button').click();
    await page.waitForFunction(() => !document.querySelector('#compare-button').disabled);
  }
  async function download(id, filename) {
    const previous = await page.evaluate(() => window.shiftproofExportEvidence.length);
    const pending = page.waitForEvent('download');
    await page.locator('#' + id).click();
    const file = await pending;
    await file.saveAs(output + '/' + filename);
    await page.waitForFunction(count => window.shiftproofExportEvidence.length > count, previous);
    return page.evaluate(() => window.shiftproofExportEvidence.at(-1));
  }
  async function review(filename = 'review.json') {
    return JSON.parse(await download('download-json', filename));
  }
  async function unchangedImport(text, name) {
    const prior = await review('before-invalid.json');
    await importCSV(baseline, text);
    await page.locator('#import-error').waitFor({ state: 'visible' });
    check((await page.locator('#import-error').innerText()).trim().length > 0, name + ': explicit error');
    const current = await review('after-invalid.json');
    check(JSON.stringify(current) === JSON.stringify(prior), name + ': current review preserved');
  }
  try {
    await page.goto(base);
    await page.locator('#demo-button').click();
    check(await count('gap-count') === 1, 'synthetic demo identifies one uncovered shift');
    check(await count('conflict-count') === 1, 'synthetic demo identifies one volunteer overlap');
    check(await count('issue-count') === 2, 'synthetic demo exposes both remaining issues');
    check((await page.locator('body').innerText()).toLowerCase().includes('synthetic'), 'sample rota is labelled synthetic');
    check((await page.locator('body').innerText()).toLowerCase().includes('local'), 'event-local time semantics are visible');
    const demo = await review('example-review.json');
    check(demo.format === 'shiftproof' && demo.before.length === 5 && demo.after.length === 5, 'portable review contains both actual demo rotas');
    await page.screenshot({ path: output + '/desktop.png', fullPage: true });

    await page.locator('.shift-row[data-shift-id="welcome"]').click();
    await page.locator('#assignment-list').getByLabel('Alex', { exact: true }).uncheck();
    await page.locator('#assignment-list').getByLabel('Jules', { exact: true }).check();
    await page.locator('#apply-assignment').focus();
    await page.keyboard.press('Enter');
    check(await count('conflict-count') === 0, 'keyboard assignment repair clears overlap');
    check(await page.evaluate(() => document.activeElement !== document.body && !document.activeElement.disabled), 'focus remains usable after keyboard repair');
    await page.locator('.shift-row[data-shift-id="donations"]').click();
    await page.locator('#assignment-list').getByLabel('Jules', { exact: true }).check();
    await page.locator('#apply-assignment').click();
    check(await count('gap-count') === 0 && await count('issue-count') === 0, 'filling donated-items shift clears all actual issues');
    const repaired = await review('repaired-review.json');
    check(repaired.after.find(s => s.id === 'welcome').volunteers.includes('Jules'), 'review exports repaired welcome assignment');
    check(repaired.after.find(s => s.id === 'donations').volunteers.includes('Jules'), 'review exports repaired donated-items assignment');
    const repairedCSV = await download('download-csv', 'repaired.csv');
    await importCSV(repairedCSV, repairedCSV);
    check(await count('change-count') === 0 && await count('issue-count') === 0, 'repaired CSV export and real upload preserve assignments');
    await upload('#review-file', JSON.stringify(repaired), 'repaired.json', 'application/json');
    check(JSON.stringify(await review('json-roundtrip.json')) === JSON.stringify(repaired), 'portable JSON export and real upload round trip');
    await page.screenshot({ path: output + '/repaired.png', fullPage: true });

    await page.locator('#person-select').selectOption({ label: 'Alex' });
    const card = await page.locator('#card-preview').innerText();
    check(card.includes('Alex') && !card.includes('Mina') && !card.includes('Jules') && !card.includes('Nora') && !card.includes('Sam'), 'individual change card excludes other volunteer names');
    check(card.toLowerCase().includes('welcome'), 'individual card exposes changed duty evidence');
    await page.emulateMedia({ media: 'print' });
    const printed = await page.locator('body').innerText();
    check(printed.includes('Alex') && !printed.includes('Mina') && !printed.includes('Jules') && !printed.includes('Nora') && !printed.includes('Sam'), 'print layout reveals only selected volunteer card');
    await page.pdf({ path: output + '/alex-card.pdf', format: 'A4', printBackground: true });
    await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });

    const quoted = '\uFEFF' + header + '\r\n' + 'desk,"Welcome, help\nDesk",2026-11-07T08:00,2026-11-07T09:00,1,"Mina ""M"""\r\n';
    await importCSV(quoted, quoted);
    const quotedReview = await review('quoted-review.json');
    check(quotedReview.after[0].task === 'Welcome, help\nDesk' && quotedReview.after[0].volunteers[0] === 'Mina "M"', 'CSV upload supports BOM, CRLF, embedded comma/newline and escaped quotes');
    check(await count('issue-count') === 0, 'quoted CSV remains a usable review');

    const malformed = [
      ['unclosed CSV quote', header + '\ndesk,"Welcome,2026-11-07T08:00,2026-11-07T09:00,1,Alex'],
      ['misplaced CSV quote', header + '\ndesk,Wel"come,2026-11-07T08:00,2026-11-07T09:00,1,Alex'],
      ['text after closing quote', header + '\ndesk,"Welcome"x,2026-11-07T08:00,2026-11-07T09:00,1,Alex'],
      ['missing header', baseline.replace('required,', '')],
      ['duplicate header', baseline.replace('required,volunteers', 'required,required')],
      ['duplicate shift ID', baseline + single + '\n'],
      ['fractional required capacity', baseline.replace(',1,Alex', ',1.5,Alex')],
      ['impossible calendar date', baseline.replaceAll('2026-11-07', '2026-02-30')],
      ['end before start', baseline.replace('T09:00', 'T07:00')],
      ['zero-length shift', baseline.replace('T09:00', 'T08:00')],
      ['case-and-space duplicate volunteer', baseline.replace(',1,Alex', ',2,Alex;  alex ')],
      ['file byte limit', header + '\n' + 'x'.repeat(513 * 1024)],
      ['row count limit', header + '\n' + Array.from({ length: 1001 }, (_, i) => single.replace('desk,', 'desk' + i + ',')).join('\n')],
    ];
    for (const [name, text] of malformed) await unchangedImport(text, name);

    const beforeNight = header + '\n' + row('night', 'Night desk', '2026-11-07T23:00', '2026-11-08T01:00', 1, 'Alex') + '\n';
    const adjacent = beforeNight + row('morning', 'Morning desk', '2026-11-08T01:00', '2026-11-08T02:00', 1, 'alex') + '\n';
    await importCSV(beforeNight, adjacent);
    check(await count('conflict-count') === 0 && await count('change-count') === 1, 'cross-midnight adjacent assignments are conflict-free and added shift is visible');
    const overlap = adjacent.replace('morning,Morning desk,2026-11-08T01:00', 'morning,Morning desk,2026-11-08T00:30');
    await importCSV(beforeNight, overlap);
    check(await count('conflict-count') === 1, 'cross-midnight overlap recognises case-normalised volunteer');
    check((await page.locator('body').innerText()).includes('Night desk') && (await page.locator('body').innerText()).includes('Morning desk'), 'conflict evidence identifies both duties');
    const withGap = adjacent + row('new', 'New table', '2026-11-08T02:00', '2026-11-08T03:00', 2, '') + '\n';
    await importCSV(adjacent, withGap);
    check(await count('gap-count') === 1 && await count('issue-count') === 1, 'empty required assignment becomes visible coverage gap');
    const issueExport = await download('download-csv', 'unresolved.csv');
    check(issueExport.includes('New table'), 'export remains available with unresolved issues');
    check((await page.locator('#status').innerText()).toLowerCase().includes('issue') || (await page.locator('body').innerText()).toLowerCase().includes('unresolved'), 'unresolved export visibly warns organisers');

    const altered = header + '\n' + row('desk', 'Renamed desk', '2026-11-07T08:30', '2026-11-07T09:30', 2, 'Mina;New person') + '\n' + row('added', 'Added station', '2026-11-07T09:30', '2026-11-07T10:00', 1, 'New person') + '\n';
    await importCSV(baseline + row('removed', 'Removed station', '2026-11-07T10:00', '2026-11-07T11:00', 1, 'Alex') + '\n', altered);
    check(await count('change-count') === 3, 'changed, added and removed stable IDs appear');
    const changedText = (await page.locator('body').innerText()).toLowerCase();
    check(changedText.includes('added') && changedText.includes('removed'), 'added and removed shift evidence is labelled');
    await page.locator('.shift-row[data-shift-id="desk"]').click();
    check(await page.locator('#assignment-list').getByLabel('New person', { exact: true }).count() === 1, 'people new to revised rota are available for manual assignment');
    await page.locator('#new-person').fill('Casey');
    await page.locator('#add-person').click();
    check(await page.locator('#assignment-list').getByLabel('Casey', { exact: true }).count() === 1, 'organiser can add a new volunteer name');
    await page.locator('#assignment-list').getByLabel('Casey', { exact: true }).check();
    await page.locator('#apply-assignment').click();
    check((await review('new-person-review.json')).after.some(s => s.volunteers.includes('Casey')), 'new volunteer can be manually assigned and exported');

    const hostile = header + '\n' + row('safe', '=1+1', '2026-11-07T08:00', '2026-11-07T09:00', 1, '<img src=x onerror=window.shiftproofInjected=1>') + '\n' + row('formula', '@Task', '2026-11-07T09:00', '2026-11-07T10:00', 1, '@Mina') + '\n';
    await importCSV(hostile, hostile);
    check(await page.evaluate(() => !window.shiftproofInjected && !document.querySelector('img[src="x"]')), 'untrusted CSV name is rendered as literal text without markup execution');
    const safeCSV = await download('download-csv', 'formula-safe.csv');
    check(safeCSV.includes("'=1+1") && safeCSV.includes("'@Task") && safeCSV.includes("'@Mina"), 'CSV download prefixes formula-leading spreadsheet cells');
    await importCSV(safeCSV, safeCSV);
    const safeReview = await review('safe-roundtrip.json');
    check(safeReview.after[0].task === '=1+1' && safeReview.after[1].volunteers[0] === '@Mina', 'spreadsheet-safe export retains original values on real reimport');
    const beforeBadJSON = JSON.stringify(safeReview);
    await upload('#review-file', '{"format":"shiftproof","version":1,"before":[],"after":[]}', 'invalid.json', 'application/json');
    await page.locator('#import-error').waitFor({ state: 'visible' });
    check(JSON.stringify(await review('after-bad-json.json')) === beforeBadJSON, 'invalid portable JSON review is rejected without overwriting current review');

    await upload('#review-file', JSON.stringify(repaired), 'repaired.json', 'application/json');
    await page.reload();
    check(await count('issue-count') === 0 && (await review('persisted.json')).after.find(s => s.id === 'welcome').volunteers.includes('Jules'), 'repaired review persists through ordinary browser reload');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    if (!await page.evaluate(() => Boolean(navigator.serviceWorker.controller))) await page.reload();
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.context().setOffline(true);
    await page.reload();
    check(await count('issue-count') === 0 && await page.locator('#download-json').isEnabled(), 'cached app and saved review work after an actual offline reload');
    await page.context().setOffline(false);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '390px layout has no horizontal overflow');
    await page.screenshot({ path: output + '/mobile.png', fullPage: true });
    await page.locator('#demo-button').focus();
    await page.keyboard.press('Tab');
    check(await page.evaluate(() => document.activeElement !== document.body), 'phone-width interface remains keyboard navigable');
    const oldReview = JSON.stringify(await review('before-reset.json'));
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#reset-button').click();
    check(JSON.stringify(await review('after-cancelled-reset.json')) === oldReview, 'dismissing reset confirmation preserves review');

    await page.addInitScript(() => {
      Storage.prototype.getItem = function () { throw new DOMException('Storage denied for verification', 'SecurityError'); };
      Storage.prototype.setItem = function () { throw new DOMException('Storage denied for verification', 'QuotaExceededError'); };
    });
    await page.reload();
    await page.locator('#demo-button').click();
    check((await page.locator('#storage-status').innerText()).toLowerCase().match(/unavailable|unable|cannot|could not|not saved|memory|blocked|failed/), 'denied storage is disclosed in the interface');
    check(await page.locator('#issue-count').innerText().then(t => /2/.test(t)), 'storage denial preserves a usable in-memory review');
    const deniedPending = page.waitForEvent('download');
    await page.locator('#download-json').click();
    const deniedDownload = await deniedPending;
    await deniedDownload.saveAs(output + '/storage-denied-review.json');
    check(!await deniedDownload.failure(), 'portable JSON download works when storage is denied');
    check(errors.length === 0, 'no uncaught JavaScript errors during real browser workflows');
    check(requests.every(url => url.startsWith(base) || url.startsWith('blob:')), 'local browser workflows issue no external tracking or CDN requests');
    const result = { result: 'passed', verified_at: new Date().toISOString(), scope: 'real browser UI, file upload/download, print, local persistence and offline workflows using synthetic fixtures', checks, screenshots: ['desktop.png', 'mobile.png', 'repaired.png'], exports: ['repaired.csv', 'repaired-review.json', 'alex-card.pdf', 'formula-safe.csv', 'storage-denied-review.json'] };
    await page.evaluate(value => { window.shiftproofVerificationResult = value; }, result);
    return result;
  } finally {
    await page.context().setOffline(false);
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 1440, height: 1080 });
  }
}
