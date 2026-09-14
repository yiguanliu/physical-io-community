'use client';
import { useRef, useState } from 'react';
import { Button, Field, Tabs, TextArea, Alert } from '@/workspace-ui/src';
import { markdownToHtml } from '@/lib/marketing/markdown';
import { renderEmailHtml } from '@/lib/email/template';

export default function EmailComposer({body,subject,onChange,disabled=false}:{body:string;subject:string;onChange:(body:string)=>void;disabled?:boolean}) {
 const fileInput=useRef<HTMLInputElement>(null);
 const [uploading,setUploading]=useState(false);
 const textarea=useRef<HTMLTextAreaElement>(null);
 const selection=useRef({start:0,end:0});
 const [tab,setTab]=useState('write');
 const [insert,setInsert]=useState<'link'|'image'|null>(null);
 const [url,setUrl]=useState(''),[label,setLabel]=useState(''),[error,setError]=useState('');
 async function upload(file:File){
  setError('');
  if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)||!file.size||file.size>4*1024*1024){setError('Choose a PNG, JPEG, WebP or GIF up to 4 MB.');return;}
  setUploading(true);
  try{const data=new FormData();data.set('image',file);const response=await fetch('/api/admin/email-image',{method:'POST',body:data});const result=await response.json();if(!response.ok)throw new Error(result.error||'Upload failed. Please try again.');setUrl(result.url);if(!label.trim())setLabel(file.name.replace(/\.[^.]+$/,''));}
  catch(e){setError(e instanceof Error?e.message:'Upload failed. Please try again.');}
  finally{setUploading(false);}
 }
 function remember(){if(textarea.current)selection.current={start:textarea.current.selectionStart,end:textarea.current.selectionEnd};}
 function add(text:string){const {start,end}=selection.current;onChange(body.slice(0,start)+text+body.slice(end));setInsert(null);requestAnimationFrame(()=>{textarea.current?.focus();textarea.current?.setSelectionRange(start+text.length,start+text.length);});}
 function format(before:string,after='',placeholder='Text'){remember();const {start,end}=selection.current;add(before+(body.slice(start,end)||placeholder)+after);}
 const preview=renderEmailHtml({previewText:subject,body,bodyHtml:markdownToHtml(body),unsubscribeUrl:'https://www.physical-io.com/unsubscribe?preview=true'});
 return <Tabs label="Email content" value={tab} onValueChange={setTab} items={[
 {value:'write',label:'Write',content:<div className="admin-stack">
 <div className="admin-inline" role="group" aria-label="Markdown formatting">
 <Button variant="ghost" disabled={disabled} onClick={()=>format('**','**')}>Bold</Button>
 <Button variant="ghost" disabled={disabled} onClick={()=>format('\n\n## ','\n\n','Heading')}>Heading</Button>
 <Button variant="ghost" disabled={disabled} onClick={()=>format('\n- ','\n','List item')}>List</Button>
 {(['link','image'] as const).map(kind=><Button key={kind} variant="ghost" disabled={disabled} onClick={()=>{remember();setInsert(kind);setUrl('');setLabel(body.slice(selection.current.start,selection.current.end));setError('');}}>{kind==='link'?'Add link':'Add image'}</Button>)}
 </div>
 {insert&&<div className="admin-stack">{insert==='image'&&<><input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={e=>{const file=e.target.files?.[0];if(file)void upload(file);e.target.value='';}}/><Button disabled={disabled||uploading} onClick={()=>fileInput.current?.click()}>{uploading?'Uploading…':'Upload from computer'}</Button><p className="admin-muted" role="status">{uploading?'Uploading your image…':'PNG, JPEG, WebP or GIF, up to 4 MB. Uploaded images are publicly viewable so recipients can see them.'}</p></>}<Field label={insert==='image'?'Image description':'Link text'} value={label} disabled={disabled} onChange={e=>setLabel(e.target.value)}/><Field label={insert==='image'?'Public image URL':'Destination URL'} placeholder="https://…" value={url} disabled={disabled||uploading} onChange={e=>setUrl(e.target.value)} hint={insert==='image'?'Upload a file above, or paste an existing public image URL.':undefined}/>{error&&<Alert title="Check the image or link" tone="danger">{error}</Alert>}<div className="admin-actions"><Button variant="ghost" disabled={uploading} onClick={()=>setInsert(null)}>Cancel</Button><Button disabled={disabled||uploading} onClick={()=>{const href=url.trim();if(!/^https?:\/\/[^\s]+$/i.test(href)||!label.trim()){setError('Enter a description and a full https:// URL.');return;}const text=label.trim().replace(/[\[\]\n\r]/g,'');add(`${insert==='image'?'\n\n!':''}[${text}](${href.replaceAll('(', '%28').replaceAll(')', '%29')})${insert==='image'?'\n\n':''}`);}}>Insert {insert}</Button></div></div>}
 <TextArea ref={textarea} label="Message" required rows={10} maxLength={50000} value={body} disabled={disabled} onChange={e=>onChange(e.target.value)} onSelect={remember} hint="Markdown supported: headings, bold, lists, links and images. Use Preview to review the email before sending."/>
 </div>},
 {value:'preview',label:'Preview',content:<div className="admin-stack"><p className="admin-muted">Preview of the email template. Personalisation is filled for each recipient when sent; the unsubscribe link here is a placeholder.</p><iframe title="Email content preview" sandbox="" srcDoc={preview} style={{width:'100%',height:520,border:'1px solid var(--ui-border)',borderRadius:'var(--ui-radius)',background:'var(--ui-bg)'}}/></div>}
 ]}/>;
}
