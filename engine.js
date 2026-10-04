// Pure roster parsing and comparison. Times are event-local, never converted.
export const HEADERS = ['shift_id', 'task', 'start', 'end', 'required', 'volunteers'];
export const MAX_BYTES = 512 * 1024;
export const MAX_ROWS = 1000;
export const personKey = name => name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en');
const nameText = name => name.trim().replace(/\s+/g, ' ');
const fail = message => { throw new Error(message); };

function minute(text, row) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(text);
  if (!m) fail(`Row ${row}: use YYYY-MM-DDTHH:mm for dates.`);
  const [, y, mo, d, h, mi] = m.map(Number);
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || h > 23 || mi > 59 || d < 1) fail(`Row ${row}: invalid date.`);
  const value = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (value.getUTCFullYear() !== y || value.getUTCMonth() !== mo - 1 || value.getUTCDate() !== d) fail(`Row ${row}: impossible calendar date.`);
  return value.getTime() / 60000;
}

// RFC 4180-style quoted cells; no eval, HTML insertion or delimiter guessing.
function csvRows(text) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) fail('CSV is too large. Limit: 512 KB.');
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], cell = '', quoted = false, closed = false, atStart = true;
  const endCell = () => { row.push(cell); cell = ''; atStart = true; closed = false; };
  const endRow = () => {
    endCell();
    if (row.some(value => value.trim())) rows.push(row);
    row = [];
    if (rows.length > MAX_ROWS + 1) fail('Too many shifts. Limit: 1,000 rows.');
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === ',') endCell();
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; endRow(); }
    else if (c === '"') {
      if (!atStart || closed) fail('CSV contains a misplaced quote.');
      quoted = true; atStart = false;
    } else {
      if (closed) fail('CSV contains text after a closing quote.');
      cell += c; atStart = false;
    }
  }
  if (quoted) fail('CSV has an unclosed quoted cell.');
  if (cell || row.length || closed) endRow();
  return rows;
}

export function validateShifts(input) {
  if (!Array.isArray(input) || !input.length || input.length > MAX_ROWS) fail('A rota must contain 1–1,000 shifts.');
  const ids = new Set();
  return input.map((shift, index) => {
    const row = index + 2;
    if (!shift || typeof shift !== 'object') fail(`Row ${row}: invalid shift.`);
    for (const field of ['id', 'task', 'start', 'end']) {
      if (typeof shift[field] !== 'string' || !shift[field].trim()) fail(`Row ${row}: ${field} is required.`);
      if (shift[field].length > 500 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(shift[field])) fail(`Row ${row}: invalid ${field}.`);
    }
    const id = shift.id.trim();
    if (ids.has(id)) fail(`Row ${row}: duplicate shift ID ${id}.`);
    ids.add(id);
    const start = shift.start.trim(), end = shift.end.trim();
    const startMinute = minute(start, row), endMinute = minute(end, row);
    if (endMinute <= startMinute) fail(`Row ${row}: end must be after start.`);
    if (endMinute - startMinute > 7 * 24 * 60) fail(`Row ${row}: a shift cannot exceed seven days.`);
    if (!Number.isInteger(shift.required) || shift.required < 1 || shift.required > 100) fail(`Row ${row}: required must be an integer from 1 to 100.`);
    if (!Array.isArray(shift.volunteers) || shift.volunteers.length > 100) fail(`Row ${row}: invalid volunteer list.`);
    const seen = new Set();
    const volunteers = shift.volunteers.map(name => {
      if (typeof name !== 'string' || !nameText(name) || name.length > 120 || /[;\r\n\u0000-\u001F]/.test(name)) fail(`Row ${row}: invalid volunteer name.`);
      const key = personKey(name);
      if (seen.has(key)) fail(`Row ${row}: duplicate volunteer ${nameText(name)}.`);
      seen.add(key);
      return nameText(name);
    });
    return {id, task: shift.task.trim(), start, end, required: shift.required, volunteers, startMinute, endMinute};
  });
}

export function parseCSV(text) {
  if (typeof text !== 'string') fail('CSV must be text.');
  const rows = csvRows(text);
  if (rows.length < 2) fail('CSV needs a header and at least one shift.');
  const headers = rows.shift().map(value => value.trim());
  if (headers.length !== HEADERS.length || new Set(headers).size !== HEADERS.length || HEADERS.some(h => !headers.includes(h))) fail(`Expected exactly these headers: ${HEADERS.join(',')}.`);
  const positions = HEADERS.map(h => headers.indexOf(h));
  return validateShifts(rows.map((cells, index) => {
    if (cells.length !== headers.length) fail(`Row ${index + 2}: expected six cells.`);
    const [id, task, start, end, capacity, names] = positions.map(i => {
      const value = cells[i];
      return /^'[\s]*[=+\-@\t\r]/.test(value) ? value.slice(1) : value;
    });
    if (!/^\d+$/.test(capacity.trim())) fail(`Row ${index + 2}: required must be a whole number.`);
    return {id, task, start, end, required: Number(capacity.trim()), volunteers: names.trim() ? names.split(';') : []};
  }));
}

const hasPerson = (shift, key) => shift?.volunteers.some(name => personKey(name) === key);
const duty = shift => shift ? {id: shift.id, task: shift.task, start: shift.start, end: shift.end} : null;
const sameNames = (a, b) => JSON.stringify(a.map(personKey).sort()) === JSON.stringify(b.map(personKey).sort());
const temporalOverlap = (a, b) => a.startMinute < b.endMinute && b.startMinute < a.endMinute;

export function analyse(before, after) {
  before = validateShifts(before); after = validateShifts(after);
  const old = new Map(before.map(s => [s.id, s]));
  const current = new Map(after.map(s => [s.id, s]));
  const changes = [];
  for (const id of new Set([...old.keys(), ...current.keys()])) {
    const a = old.get(id), b = current.get(id), fields = [];
    if (a && b) {
      if (a.start !== b.start || a.end !== b.end) fields.push('time');
      if (a.task !== b.task) fields.push('task');
      if (a.required !== b.required) fields.push('capacity');
      if (!sameNames(a.volunteers, b.volunteers)) fields.push('volunteers');
    }
    if (!a || !b || fields.length) changes.push({id, kind: !a ? 'added' : !b ? 'removed' : 'changed', before: a || null, after: b || null, fields});
  }
  const people = new Map();
  for (const shift of [...before, ...after]) for (const name of shift.volunteers) if (!people.has(personKey(name))) people.set(personKey(name), name);
  const gaps = after.filter(s => s.volunteers.length < s.required).map(s => ({id: s.id, task: s.task, missing: s.required - s.volunteers.length, assigned: s.volunteers.length, required: s.required}));
  const conflicts = [];
  for (const [key, person] of people) {
    const duties = after.filter(s => hasPerson(s, key)).sort((a, b) => a.startMinute - b.startMinute);
    for (let i = 0; i < duties.length; i++) for (let j = i + 1; j < duties.length && duties[j].startMinute < duties[i].endMinute; j++) if (temporalOverlap(duties[i], duties[j])) conflicts.push({person, a: duties[i], b: duties[j]});
  }
  const cards = [...people].map(([key, person]) => {
    const notices = changes.flatMap(change => {
      const a = hasPerson(change.before, key) ? change.before : null;
      const b = hasPerson(change.after, key) ? change.after : null;
      if (!a && !b) return [];
      if (a && b && a.task === b.task && a.start === b.start && a.end === b.end) return [];
      return [{id: change.id, kind: !a ? 'added' : !b ? 'removed' : 'changed', before: duty(a), after: duty(b)}];
    });
    return {person, changes: notices, conflicts: conflicts.filter(c => personKey(c.person) === key).map(c => ({a: duty(c.a), b: duty(c.b)}))};
  }).sort((a, b) => a.person.localeCompare(b.person));
  return {changes, gaps, conflicts, people: [...people.values()].sort((a, b) => a.localeCompare(b)), cards, issues: gaps.length + conflicts.length};
}

export function updateAssignment(after, id, volunteers) {
  if (!after.some(s => s.id === id)) fail('Unknown shift.');
  return validateShifts(after.map(s => s.id === id ? {...s, volunteers} : s));
}

export function candidates(after, id, people) {
  const target = after.find(s => s.id === id);
  return people.map(person => ({person, overlaps: after.filter(s => s.id !== id && hasPerson(s, personKey(person)) && temporalOverlap(s, target)).map(s => s.task)}));
}

// Prefix dangerous spreadsheet cells; imports remove only our own export prefix.
function csvCell(value) {
  let text = String(value);
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replaceAll('"', '""') + '"' : text;
}
export function exportCSV(shifts) {
  return HEADERS.join(',') + '\r\n' + validateShifts(shifts).map(s => [s.id, s.task, s.start, s.end, s.required, s.volunteers.join(';')].map(csvCell).join(',')).join('\r\n') + '\r\n';
}
export function exportReview(before, after) {
  return JSON.stringify({format: 'shiftproof', version: 1, before: validateShifts(before), after: validateShifts(after)}, null, 2);
}
export function parseReview(text) {
  if (new TextEncoder().encode(text).length > MAX_BYTES * 3) fail('Review is too large.');
  let data;
  try { data = JSON.parse(text); } catch { fail('Review is not valid JSON.'); }
  if (!data || typeof data !== 'object' || data.format !== 'shiftproof' || data.version !== 1) fail('Unsupported review file.');
  return {before: validateShifts(data.before), after: validateShifts(data.after)};
}

export const DEMO_BEFORE = `shift_id,task,start,end,required,volunteers
welcome,Welcome desk,2026-11-07T08:00,2026-11-07T09:30,2,Alex;Mina
setup,Set up repair tables,2026-11-07T09:30,2026-11-07T11:00,1,Alex
donations,Sort donated items,2026-11-07T10:00,2026-11-07T11:00,2,Mina;Jules
sorting,Repair station,2026-11-07T11:00,2026-11-07T12:00,2,Jules;Sam
pickup,Pack and collect,2026-11-07T12:00,2026-11-07T13:00,1,Nora
`;
export const DEMO_AFTER = `shift_id,task,start,end,required,volunteers
welcome,Welcome desk,2026-11-07T08:30,2026-11-07T10:00,2,Alex;Mina
setup,Set up repair tables,2026-11-07T09:30,2026-11-07T11:00,1,Alex
donations,Sort donated items,2026-11-07T10:00,2026-11-07T11:00,2,Mina
sorting,Repair station,2026-11-07T11:00,2026-11-07T12:00,2,Jules;Sam
distribution,Hand back repaired items,2026-11-07T12:00,2026-11-07T13:00,2,Nora;Sam
`;
