import {parseCSV, analyse, updateAssignment, candidates, exportCSV, exportReview, parseReview, personKey, DEMO_BEFORE, DEMO_AFTER} from './engine.js';

const $ = id => document.getElementById(id);
const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
const STORAGE_KEY = 'shiftproof-review';
let before, after, sample = true, selectedShift = '', selectedPerson = '', extraPeople = [], currentAnalysis, storageAvailable = true;
const sampleReview = () => ({before: parseCSV(DEMO_BEFORE), after: parseCSV(DEMO_AFTER)});
const clock = text => text ? text.slice(11) : '';
const dateText = text => text ? `${text.slice(8,10)} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(text.slice(5,7)) - 1]} ${text.slice(0,4)}` : '';
const timeText = shift => shift ? `${dateText(shift.start)} · ${clock(shift.start)}–${shift.start.slice(0,10) === shift.end.slice(0,10) ? clock(shift.end) : `${dateText(shift.end)} ${clock(shift.end)}`}` : 'No duty';
const announce = message => { $('status').textContent = message; };
function showError(id, message = '') { $(id).textContent = message; $(id).hidden = !message; }
function storageMessage() { $('storage-status').textContent = storageAvailable ? 'Review saved only in this browser. Files and names stay on your device.' : 'Browser storage is unavailable. This review stays open; download JSON to keep it.'; }
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({review: exportReview(before, after), sample})); storageAvailable = true; }
  catch { storageAvailable = false; }
  storageMessage();
}
function replaceReview(review, isSample, message) {
  before = review.before; after = review.after; sample = isSample; selectedShift = ''; selectedPerson = ''; extraPeople = [];
  showError('import-error'); showError('assignment-error'); save(); render(); announce(message);
}
function allPeople() {
  const names = new Map();
  for (const name of [...currentAnalysis.people, ...extraPeople]) if (!names.has(personKey(name))) names.set(personKey(name), name);
  return [...names.values()].sort((a,b) => a.localeCompare(b));
}
function render() {
  currentAnalysis = analyse(before, after);
  if (!selectedShift || ![...after, ...before].some(s => s.id === selectedShift)) {
    selectedShift = currentAnalysis.conflicts[0]?.a.id || currentAnalysis.gaps[0]?.id || currentAnalysis.changes[0]?.id || after[0].id;
  }
  $('data-label').textContent = sample ? 'SYNTHETIC EXAMPLE · CAMPUS REPAIR DAY' : 'YOUR ROTA · EVENT-LOCAL TIMES';
  $('change-count').textContent = currentAnalysis.changes.length;
  $('gap-count').textContent = currentAnalysis.gaps.length;
  $('conflict-count').textContent = currentAnalysis.conflicts.length;
  $('issue-count').textContent = currentAnalysis.issues;
  $('review-badge').textContent = currentAnalysis.issues ? `${currentAnalysis.issues} ${currentAnalysis.issues === 1 ? 'check' : 'checks'} to resolve` : 'No gaps or double bookings';
  $('review-badge').classList.toggle('clear', currentAnalysis.issues === 0);
  $('export-note').textContent = currentAnalysis.issues ? `Exports include ${currentAnalysis.issues} unresolved ${currentAnalysis.issues === 1 ? 'check' : 'checks'}. Review these before sharing.` : 'Download the revised rota and a review you can reopen here.';
  document.querySelector('.export-panel').classList.toggle('has-issues', currentAnalysis.issues > 0);
  renderRota(); renderDetail(); renderCards(); storageMessage();
}
function renderRota() {
  const shifts = new Map([...before, ...after].map(s => [s.id, s]));
  const low = Math.min(...[...before,...after].map(s=>s.startMinute)), high = Math.max(...[...before,...after].map(s=>s.endMinute)), range = high-low;
  const heading = $('timeline-heading'); heading.replaceChildren();
  const minShift = [...before,...after].find(s=>s.startMinute===low), maxShift = [...before,...after].find(s=>s.endMinute===high);
  heading.append(node('span','',`${dateText(minShift.start)} · ${clock(minShift.start)}`), node('span','',`${maxShift.end.slice(0,10) !== minShift.start.slice(0,10) ? `${dateText(maxShift.end)} · ` : ''}${clock(maxShift.end)}`));
  const list = $('shift-list'); list.replaceChildren();
  for (const shift of [...shifts.values()].sort((a,b)=>a.startMinute-b.startMinute || a.id.localeCompare(b.id))) {
    const old = before.find(s=>s.id===shift.id), revised = after.find(s=>s.id===shift.id), change = currentAnalysis.changes.find(c=>c.id===shift.id);
    const gaps = currentAnalysis.gaps.filter(g=>g.id===shift.id), conflicts = currentAnalysis.conflicts.filter(c=>c.a.id===shift.id || c.b.id===shift.id);
    const row = node('button',`shift-row${!revised ? ' removed' : ''}`); row.type='button'; row.dataset.shiftId=shift.id; row.dataset.issues=String(gaps.length+conflicts.length); row.setAttribute('aria-pressed',String(selectedShift===shift.id));
    const top=node('div','row-top'), tags=node('div','row-tags');
    top.append(node('span','row-task',shift.task));
    if (change) tags.append(node('span',`tag ${change.kind}`,change.kind === 'changed' ? 'Changed' : change.kind === 'added' ? 'Added' : 'Removed'));
    if (gaps.length) tags.append(node('span','tag gap',`${gaps[0].missing} needed`));
    if (conflicts.length) tags.append(node('span','tag conflict',`${conflicts.length} ${conflicts.length===1?'conflict':'conflicts'}`));
    if (!change && !gaps.length && !conflicts.length) tags.append(node('span','tag','Unchanged'));
    top.append(tags); row.append(top);
    const tracks = node('div','timeline-tracks'); tracks.setAttribute('aria-hidden','true');
    for (const [source, cls] of [[old,'old'],[revised,'new']]) {
      const bar=node('div',source?`track-line ${cls}`:'track-placeholder');
      if(source) {bar.style.marginLeft=`${100*(source.startMinute-low)/range}%`;bar.style.width=`${100*(source.endMinute-source.startMinute)/range}%`;}
      tracks.append(bar);
    }
    row.append(tracks);
    const bottom=node('div','row-bottom');bottom.append(node('span','row-time',`${clock(shift.start)}–${clock(shift.end)}`),node('span','',(revised||old).volunteers.join(' · ') || 'No one assigned'));row.append(bottom);
    row.addEventListener('click',()=>{selectedShift=shift.id;showError('assignment-error');renderRota();renderDetail();[...list.querySelectorAll('.shift-row')].find(el=>el.dataset.shiftId===shift.id)?.focus({preventScroll:true});announce(`Reviewing ${shift.task}.`);}); list.append(row);
  }
}
function renderDetail() {
  const old = before.find(s=>s.id===selectedShift), revised = after.find(s=>s.id===selectedShift), active=revised||old;
  const detail=$('shift-detail');detail.replaceChildren();detail.append(node('h4','detail-title',active.task));
  const comparison=node('div','detail-comparison');
  for(const [source,label,cls] of [[old,'Previous',''],[revised,'Revised',' revised']]) {
    const cell=node('div',`detail-cell${cls}`);cell.append(node('span','detail-label',label),node('p','',source?timeText(source):label==='Previous'?'Not in previous rota':'Removed from revised rota'));
    if(source)cell.append(node('p','',source.volunteers.join(' · ') || 'No one assigned'));comparison.append(cell);
  }
  detail.append(comparison);
  const gap=currentAnalysis.gaps.find(g=>g.id===selectedShift), conflicts=currentAnalysis.conflicts.filter(c=>c.a.id===selectedShift||c.b.id===selectedShift);
  if(gap)detail.append(node('p','detail-issue',`${gap.assigned} of ${gap.required} assigned. ${gap.missing} more ${gap.missing===1?'volunteer is':'volunteers are'} needed.`));
  for(const conflict of conflicts)detail.append(node('p','detail-issue',`${conflict.person} is also assigned to ${(conflict.a.id===selectedShift?conflict.b:conflict.a).task} at an overlapping time.`));
  if(revised&&!gap&&!conflicts.length)detail.append(node('p','detail-clear','✓ Coverage and overlaps are clear for this shift.'));
  const change=currentAnalysis.changes.find(c=>c.id===selectedShift);
  if(change?.fields.length)detail.append(node('p','detail-evidence',`Changed: ${change.fields.map(f=>f==='volunteers'?'assignments':f).join(', ')}. Shift ID: ${active.id}.`));
  $('assignment-fieldset').disabled=!revised;$('assignment-list').replaceChildren();
  if(!revised){$('assignment-list').append(node('p','assignment-note','This shift was removed. Its former volunteers will see it on their change cards.'));return;}
  for(const candidate of candidates(after,selectedShift,allPeople())) {
    const label=node('label','candidate'), checkbox=node('input');checkbox.type='checkbox';checkbox.value=candidate.person;checkbox.name='volunteer';checkbox.setAttribute('aria-label',candidate.person);checkbox.checked=revised.volunteers.some(p=>personKey(p)===personKey(candidate.person));
    const text=node('span','candidate-text',candidate.person);
    if(candidate.overlaps.length)text.append(node('small','',`Overlaps: ${candidate.overlaps.join(', ')}`));
    label.append(checkbox,text,node('span','candidate-status',candidate.overlaps.length?'Review overlap':'No overlap'));$('assignment-list').append(label);
  }
}
function renderCards() {
  const previous=selectedPerson||$('person-select').value, select=$('person-select');select.replaceChildren();
  for(const card of currentAnalysis.cards){const option=node('option','',card.person);option.value=card.person;select.append(option);}
  if(currentAnalysis.cards.some(c=>c.person===previous))select.value=previous;
  selectedPerson=select.value;renderCard();
}
function renderCard() {
  const card=currentAnalysis.cards.find(c=>c.person===$('person-select').value), preview=$('card-preview');preview.replaceChildren();$('print-card').disabled=!card;
  if(!card){preview.append(node('p','card-empty','Assign a volunteer to create a personal change card.'));return;}
  selectedPerson=card.person;
  const top=node('div','card-topline');top.append(node('span','','SHIFTPROOF / PERSONAL CHANGE CARD'),node('span','',sample?'Fictional example':'Event-local times'));preview.append(top,node('h3','card-person',`${card.person},`),node('p','card-subtitle',card.changes.length?'here is what changed in your plan.':'your duties have not changed.'));
  if(!card.changes.length)preview.append(node('p','card-empty','No duty changes between the two rota versions.'));
  for(const change of card.changes){
    const notice=node('article','notice'), head=node('div','notice-head');head.append(node('span',`tag ${change.kind}`,change.kind==='added'?'New duty':change.kind==='removed'?'Duty removed':'Time or task changed'),node('span','',change.after?.task||change.before.task));notice.append(head);
    const flow=node('div','notice-flow');
    for(const [duty,label,cls] of [[change.before,'Before',''],[change.after,'Now',' new']]){
      const block=node('div',`notice-state${cls}`);block.append(node('span','detail-label',label));
      if(duty)block.append(node('strong','',duty.task),node('p','',timeText(duty)));else block.append(node('p','',label==='Before'?'No duty assigned':'No longer assigned'));
      flow.append(block);if(label==='Before')flow.append(node('span','','→'));
    }notice.append(flow);preview.append(notice);
  }
  for(const conflict of card.conflicts)preview.append(node('p','card-warning',`Your ${conflict.a.task} and ${conflict.b.task} duties still overlap. Ask the organiser to confirm the plan.`));
  if(currentAnalysis.issues)preview.append(node('p','card-warning',`The overall rota has ${currentAnalysis.issues} unresolved ${currentAnalysis.issues===1?'check':'checks'}. Confirm this card with the organiser before using it.`));
  preview.append(node('p','card-footnote','Times follow the event’s local clock. This card shows rota changes; it does not confirm your availability or agreement. Contact your organiser if a duty does not work for you.'));
}
function download(content,name,type) {
  const url=URL.createObjectURL(new Blob([content],{type})), link=node('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportMessage(label) {announce(currentAnalysis.issues ? `${label} downloaded with ${currentAnalysis.issues} unresolved checks. Review before sharing.` : `${label} downloaded. Confirm reassignments with volunteers before sharing.`);}

$('compare-button').addEventListener('click',async()=>{
  const old=$('before-file').files[0], revised=$('after-file').files[0];
  if(!old||!revised){showError('import-error','Choose both the previous and revised CSV files, then compare them.');return;}
  const button=$('compare-button');button.disabled=true;
  try{
    if(old.size>512*1024||revised.size>512*1024)throw new Error('CSV is too large. Limit: 512 KB.');
    const texts=await Promise.all([old.text(),revised.text()]);const review={before:parseCSV(texts[0]),after:parseCSV(texts[1])};
    replaceReview(review,false,'Both rotas loaded. Review the changes and unresolved checks.');
  }catch(error){showError('import-error',`${error.message} Your current review has been kept.`);}finally{button.disabled=false;}
});
for(const side of ['before','after'])$(`${side}-file`).addEventListener('change',()=>{$(`${side}-file-status`).textContent=$(`${side}-file`).files[0]?.name||`${side==='before'?'Original':'Updated'} version · CSV`;showError('import-error');});
$('review-file').addEventListener('change',async()=>{
  const file=$('review-file').files[0];if(!file)return;
  try{if(file.size>1536*1024)throw new Error('Review is too large.');replaceReview(parseReview(await file.text()),false,'Saved review reopened. All checks recomputed.');}
  catch(error){showError('import-error',`${error.message} Your current review has been kept.`);}finally{$('review-file').value='';}
});
$('assignment-form').addEventListener('submit',event=>{
  event.preventDefault();if(!after.some(s=>s.id===selectedShift))return;
  try{const names=[...$('assignment-list').querySelectorAll('input:checked')].map(input=>input.value);after=updateAssignment(after,selectedShift,names);showError('assignment-error');save();render();$('apply-assignment').focus();announce(`Assignments saved. ${currentAnalysis.issues ? `${currentAnalysis.issues} checks remain.` : 'No gaps or double bookings remain.'}`);}
  catch(error){showError('assignment-error',error.message);}
});
$('add-person').addEventListener('click',()=>{
  const input=$('new-person'), name=input.value.trim().replace(/\s+/g,' ');
  try{
    if(!name)throw new Error('Enter a volunteer name.');
    if(allPeople().some(p=>personKey(p)===personKey(name)))throw new Error('That volunteer is already listed. Select their checkbox.');
    const shift=after.find(s=>s.id===selectedShift), draft=[...$('assignment-list').querySelectorAll('input:checked')].map(el=>el.value);updateAssignment(after,selectedShift,[...shift.volunteers,name]);extraPeople.push(name);renderDetail();
    for(const checkbox of $('assignment-list').querySelectorAll('input'))checkbox.checked=draft.some(p=>personKey(p)===personKey(checkbox.value));
    const added=[...$('assignment-list').querySelectorAll('input')].find(el=>el.value===name);added.checked=true;added.focus();input.value='';showError('assignment-error');announce(`${name} added to the choices. Save assignments to update the rota.`);
  }catch(error){showError('assignment-error',error.message);input.focus();}
});
$('new-person').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('add-person').click();}});
$('person-select').addEventListener('change',renderCard);
$('print-card').addEventListener('click',()=>{renderCard();window.print();});
$('download-csv').addEventListener('click',()=>{download(exportCSV(after),`shiftproof-rota${currentAnalysis.issues?'-unresolved':''}.csv`,'text/csv;charset=utf-8');exportMessage('Revised rota');});
$('download-json').addEventListener('click',()=>{download(exportReview(before,after),`shiftproof-review${currentAnalysis.issues?'-unresolved':''}.json`,'application/json');exportMessage('Portable review');});
$('download-template').addEventListener('click',()=>download(DEMO_BEFORE,'shiftproof-example.csv','text/csv;charset=utf-8'));
$('demo-button').addEventListener('click',()=>{if(!sample&&!window.confirm('Replace this review with the fictional example? Download your JSON first if you want to keep it.'))return;replaceReview(sampleReview(),true,'Fictional campus repair day loaded. Try resolving the two checks.');});
$('reset-button').addEventListener('click',()=>{
  if(!window.confirm('Clear the saved review from this browser and return to the fictional example? Download your JSON first if you want to keep it.'))return;
  try{localStorage.removeItem(STORAGE_KEY);storageAvailable=true;}catch{storageAvailable=false;}
  const review=sampleReview();before=review.before;after=review.after;sample=true;selectedShift='';selectedPerson='';extraPeople=[];
  $('before-file').value='';$('after-file').value='';$('before-file-status').textContent='Original version · CSV';$('after-file-status').textContent='Updated version · CSV';showError('import-error');showError('assignment-error');render();
  if(storageAvailable)$('storage-status').textContent='Saved review cleared. The fictional example is open and has not been saved.';announce('Saved review cleared. Fictional example restored.');
});

({before,after}=sampleReview());
try{const saved=localStorage.getItem(STORAGE_KEY);if(saved){const wrapper=JSON.parse(saved), review=parseReview(wrapper.review);before=review.before;after=review.after;sample=wrapper.sample===true;}else{save();}}
catch{storageAvailable=false;}
render();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('offline-pill').replaceChildren(node('span','','↳'),document.createTextNode(' On your device. Ready offline.'));$('offline-pill').firstChild.setAttribute('aria-hidden','true');}).catch(()=>{$('storage-status').textContent+=' Offline caching is not available in this browser.';});
