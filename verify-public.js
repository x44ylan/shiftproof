async page => {
  const base='https://x44ylan.com/shiftproof/';
  const externalResponses=[];
  page.on('response', response=>{if(!response.url().startsWith('https://x44ylan.com/'))externalResponses.push({host:response.url().split('/')[2],status:response.status()});});
  await page.addInitScript(()=>{window.policyViolations=[];document.addEventListener('securitypolicyviolation',event=>window.policyViolations.push({directive:event.effectiveDirective,host:(()=>{try{return new URL(event.blockedURI).hostname;}catch{return event.blockedURI;}})()}));});
  const response=await page.goto(base);
  if(response.status()!==200)throw Error('Public HTTPS app unavailable');
  await page.locator('#demo-button').click();
  if(await page.locator('#issue-count').innerText()!=='2')throw Error('Deployed demo not functional');
  const violations=await page.evaluate(()=>window.policyViolations);
  if(!violations.some(v=>v.host==='static.cloudflareinsights.com'&&v.directive==='script-src-elem'))throw Error('Injected analytics was not blocked');
  await page.locator('.shift-row[data-shift-id="setup"]').click();
  await page.locator('#assignment-list').getByLabel('Alex',{exact:true}).uncheck();
  await page.locator('#assignment-list').getByLabel('Jules',{exact:true}).check();
  await page.locator('#apply-assignment').click();
  if(await page.locator('#conflict-count').innerText()!=='0')throw Error('Public repair failed');
  const download=page.waitForEvent('download');await page.locator('#download-json').click();if(await(await download).failure())throw Error('CSP broke download');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready});
  await page.context().setOffline(true);await page.reload();
  if(await page.locator('#issue-count').innerText()!=='1')throw Error('Public offline persistence failed');
  await page.context().setOffline(false);
  await page.goto(base+'demo.html');
  const metadata=await page.locator('video').evaluate(v=>new Promise((resolve,reject)=>{if(v.readyState>=1)return resolve({width:v.videoWidth,height:v.videoHeight,duration:v.duration});v.onloadedmetadata=()=>resolve({width:v.videoWidth,height:v.videoHeight,duration:v.duration});v.onerror=()=>reject(Error('Video cannot decode'));setTimeout(()=>reject(Error('Video metadata timeout')),15000);}));
  if(metadata.duration<120||metadata.duration>180||!metadata.width)throw Error('Invalid demo video');
  if(externalResponses.length)throw Error('Unexpected third-party network response');
  return {result:'passed',verified_at:new Date().toISOString(),url:base,checks:['HTTPS app','native policy blocks injected analytics','public assignment repair','CSP-compatible download','actual offline reload with repaired state','public two-to-three-minute video decodes','no third-party network responses'],blocked_scripts:violations,video:metadata};
}
