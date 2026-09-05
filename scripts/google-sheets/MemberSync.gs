// Paste into a standalone project at script.google.com; the sheet stays read-only.
const MEMBER_SHEET_ID = '1c-_QhErVJrSDMo0kYyYoGTYETtYLJ0fxJmgIebCAukU';
const MEMBER_TAB_ID = 1208179166;
const MEMBER_SYNC_URL = 'https://www.physical-io.com/api/integrations/google-sheets/members';

function installMemberSync() {
  if (!PropertiesService.getScriptProperties().getProperty('GOOGLE_SHEETS_SYNC_SECRET')) {
    throw new Error('Add GOOGLE_SHEETS_SYNC_SECRET in Project Settings → Script properties first.');
  }
  // Verify one successful reconciliation before enabling automatic writes.
  syncMembersNow();
  ScriptApp.getProjectTriggers().filter(t => ['syncMembersNow','memberSheetEdited'].includes(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('syncMembersNow').forSpreadsheet(MEMBER_SHEET_ID).onFormSubmit().create();
  ScriptApp.newTrigger('memberSheetEdited').forSpreadsheet(MEMBER_SHEET_ID).onEdit().create();
  ScriptApp.newTrigger('syncMembersNow').timeBased().everyMinutes(5).create();
}

function memberSheetEdited(e) {
  if (e && e.range && e.range.getSheet().getSheetId() === MEMBER_TAB_ID) syncMembersNow();
}

function stopMemberSync() {
  ScriptApp.getProjectTriggers().filter(t => ['syncMembersNow','memberSheetEdited'].includes(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
}

function syncMembersNow() {
  const lock=LockService.getScriptLock();
  if (!lock.tryLock(1000)) return; // The active run or next reconciliation handles it.
  try {
    const sheet=SpreadsheetApp.openById(MEMBER_SHEET_ID).getSheets().find(s=>s.getSheetId()===MEMBER_TAB_ID);
    if(!sheet) throw new Error('Expected source tab was not found');
    const values=sheet.getDataRange().getDisplayValues();
    const headers=values.shift();
    const mapping={full_name:'Full Name',email:'Email Address',city:'Which city are you base?',professional_role:'What best describes you?',experience_range:'How many years have you been working in the industry?',website_url:"What's your Company/Portfolio/Github Website link?",linkedin_url:"What's your Linedkin link?",suggestions:"Anything you'd love to see this community do?"};
    const indexes={};Object.keys(mapping).forEach(k=>{indexes[k]=headers.indexOf(mapping[k]);if(indexes[k]<0)throw new Error('Required column missing: '+mapping[k]);});
    const unique=new Map();
    values.forEach((cells,i)=>{
      if(cells.every(v=>!v.trim()))return;
      const row={};Object.keys(mapping).forEach(k=>row[k]=(cells[indexes[k]]||'').trim());
      row.email=row.email.toLowerCase();
      if(!/^\S+@\S+\.\S+$/.test(row.email)||!row.full_name)throw new Error('Check name and email at sheet row '+(i+2));
      // Duplicate emails are merged in sheet order; later nonempty answers win.
      const prior=unique.get(row.email)||{};Object.keys(row).forEach(k=>{if(!row[k]&&prior[k])row[k]=prior[k];});unique.set(row.email,row);
    });
    const rows=Array.from(unique.values());const totals={created:0,updated:0,unchanged:0};
    for(let i=0;i<rows.length;i+=100){
      const payload={spreadsheetId:MEMBER_SHEET_ID,sheetId:MEMBER_TAB_ID,requestId:Utilities.getUuid(),capturedAt:Date.now(),rows:rows.slice(i,i+100)};
      const result=sendMemberBatch_(JSON.stringify(payload));
      Object.keys(totals).forEach(k=>totals[k]+=result[k]||0);
    }
    PropertiesService.getScriptProperties().setProperty('LAST_SYNC',JSON.stringify({at:new Date().toISOString(),...totals}));
    console.log(JSON.stringify(totals)); // Counts only; never log member data or the secret.
  } finally {lock.releaseLock();}
}

function sendMemberBatch_(body) {
  const secret=PropertiesService.getScriptProperties().getProperty('GOOGLE_SHEETS_SYNC_SECRET');
  if(!secret||secret.length<32)throw new Error('Sync secret is missing or too short');
  for(let attempt=0;attempt<3;attempt++){
    const timestamp=String(Date.now());
    const signature=Utilities.computeHmacSha256Signature(timestamp+'.'+body,secret,Utilities.Charset.UTF_8).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
    let response;
    try{response=UrlFetchApp.fetch(MEMBER_SYNC_URL,{method:'post',contentType:'application/json',payload:body,headers:{'x-sync-timestamp':timestamp,'x-sync-signature':signature},muteHttpExceptions:true,followRedirects:false});}
    catch(e){if(attempt===2)throw new Error('Sync network request failed');Utilities.sleep(1000*(attempt+1));continue;}
    const code=response.getResponseCode();
    if(code===200)return JSON.parse(response.getContentText());
    if(code<500&&code!==429)throw new Error('Sync rejected (HTTP '+code+'); check endpoint configuration and source data');
    Utilities.sleep(1000*(attempt+1));
  }
  throw new Error('Sync unavailable after retries; next reconciliation will retry');
}
