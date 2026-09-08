import { z } from 'zod';
const color=z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const layerSchema=z.object({
 id:z.string().max(100),name:z.string().min(1).max(100),type:z.enum(['text','image','logo','shape']),
 x:z.number().min(-4096).max(4096),y:z.number().min(-4096).max(4096),width:z.number().min(1).max(8192),height:z.number().min(1).max(8192),
 rotation:z.number().min(-360).max(360),opacity:z.number().min(0).max(1),hidden:z.boolean(),locked:z.boolean(),
 text:z.string().max(5000),src:z.string().max(2000).refine(s=>!s||/^https?:\/\//i.test(s)),
 fontSize:z.number().min(8).max(500),fontFamily:z.enum(['Manrope','Georgia','monospace']),weight:z.number().int().min(100).max(900),
 color,align:z.enum(['left','center','right']),lineHeight:z.number().min(.5).max(3),letterSpacing:z.number().min(-10).max(50),
 fit:z.enum(['cover','contain']),radius:z.number().min(0).max(1000),shadow:z.number().min(0).max(100),roughness:z.number().min(0).max(30).default(0),blur:z.number().min(0).max(30).default(0),rgbShift:z.number().min(0).max(30).default(0),
});
export const visualSchema=z.object({version:z.literal(1),format:z.enum(['instagram','linkedin','x','post','website','email','custom']),width:z.number().int().min(100).max(4096),height:z.number().int().min(100).max(4096),background:color,grain:z.number().min(0).max(1).default(0),grainSize:z.number().min(1).max(8).default(2),overlay:color,overlayOpacity:z.number().min(0).max(1),overlayMode:z.enum(['solid','gradient']),layers:z.array(layerSchema).max(80)}).refine(d=>new Set(d.layers.map(l=>l.id)).size===d.layers.length,'Layer IDs must be unique.');
export type VisualDocument=z.infer<typeof visualSchema>;
export type VisualLayer=z.infer<typeof layerSchema>;
export const FORMATS={instagram:{label:'Instagram',width:1080,height:1350},linkedin:{label:'LinkedIn',width:1200,height:627},x:{label:'X',width:1600,height:900},post:{label:'Square post',width:1080,height:1080},website:{label:'Website',width:1600,height:900},email:{label:'Email',width:600,height:400},custom:{label:'Custom',width:1080,height:1080}};
export function makeLayer(type:VisualLayer['type'],patch:Partial<VisualLayer>={}):VisualLayer{return {id:crypto.randomUUID(),name:type==='text'?'Text':type==='logo'?'Brand mark':type==='shape'?'Shape':'Image',type,x:70,y:70,width:600,height:200,rotation:0,opacity:1,hidden:false,locked:false,text:'Your text here',src:'',fontSize:64,fontFamily:'Manrope',weight:700,color:'#ffffff',align:'left',lineHeight:1.2,letterSpacing:0,fit:'cover',radius:0,shadow:0,roughness:type==='text'?4:0,blur:type==='text'?1.5:0,rgbShift:type==='text'?1:0,...patch};}
export function initialVisual(title:string):VisualDocument{return {version:1,format:'instagram',width:1080,height:1350,background:'#111111',grain:0,grainSize:2,overlay:'#000000',overlayOpacity:.45,overlayMode:'gradient',layers:[makeLayer('logo',{width:54,height:54}),makeLayer('text',{name:'Brand name',text:'Physical I/O',x:142,y:76,width:380,height:54,fontSize:30,weight:600}),makeLayer('text',{name:'Headline',text:title,y:940,width:940,height:330})]};}
export function resizeVisual(doc:VisualDocument,width:number,height:number):VisualDocument{const sx=width/doc.width,sy=height/doc.height;return {...doc,width,height,layers:doc.layers.map(l=>({...l,x:l.x*sx,y:l.y*sy,width:l.width*sx,height:l.height*(l.type==='logo'?sx:sy),fontSize:Math.max(8,Math.min(500,l.fontSize*sy)),letterSpacing:Math.max(-10,Math.min(50,l.letterSpacing*sy))}))};}

// Typography follows text-box height, so format round trips preserve readable type.
export const POSTER_PRESETS=[{id:'robotics',name:'Episode 02 · Robotics'},{id:'gathering',name:'Episode 02 · The gathering'}] as const;
export function posterVisual(kind:typeof POSTER_PRESETS[number]['id'],format:VisualDocument['format'],origin:string,width=FORMATS[format].width,height=FORMATS[format].height):VisualDocument{
 const unit=Math.min(width,height),pad=unit*.065;
 const headline=kind==='robotics'?'Love,\nintelligence\n+body.':'Intelligence\nis becoming\nphysical.';
 const size=unit*.084,top=height*.385;
 return {version:1,format,width,height,background:'#111111',grain:0,grainSize:2,overlay:'#000000',overlayOpacity:.68,overlayMode:'solid',layers:[
 makeLayer('image',{name:'Existing Physical I/O photography',src:new URL(kind==='robotics'?'/assets/about_hero.jpg':'/assets/home_bg.jpg',origin).href,x:0,y:0,width,height,locked:true}),
 makeLayer('logo',{x:pad,y:pad,width:unit*.075,height:unit*.044}),
 makeLayer('text',{name:'Brand name',text:'Physical I/O',x:width-pad-unit*.4,y:pad-unit*.015,width:unit*.4,height:unit*.06,fontSize:unit*.026,weight:600,align:'right'}),
 makeLayer('text',{name:'Episode',text:'EPISODE 02 / ROBOTICS',x:pad,y:height*.805,width:width-pad*2,height:unit*.05,fontSize:unit*.021,letterSpacing:unit*.0015,weight:600,align:'center'}),
 makeLayer('text',{name:'Headline',text:headline,x:width*.31,y:top,width:width*.63-pad,height:size*3*1.12,fontSize:size,lineHeight:1.05,letterSpacing:-unit*.002,weight:700}),
 makeLayer('text',{name:'Supporting line',text:kind==='robotics'?'What happens when intelligence has a body?':'Meet the people giving intelligence a body.',x:pad,y:height*.195,width:width-pad*2,height:unit*.08,fontSize:unit*.021,lineHeight:1.25,weight:500,align:'center'}),
 ]};
}
// Only upgrade the untouched, generated Episode 02 starter; custom layouts stay intact.
export function upgradeTemplatePoster(doc:VisualDocument,title:string,origin:string):VisualDocument{
 const text=doc.layers.filter(l=>l.type==='text');
 if(title==='Template · Episode 02 announcement'&&doc.layers.length===3&&doc.layers.some(l=>l.type==='logo')&&text.length===2&&text.some(l=>l.name==='Headline'&&l.text===title)&&text.some(l=>l.name==='Brand name'&&l.text==='Physical I/O'))return posterVisual('robotics',doc.format,origin,doc.width,doc.height);
 return doc;
}

export type VisualLayouts=Partial<Record<VisualDocument['format'],VisualDocument>>;
/** Read the legacy active document plus independently saved formats. */
export function readVisualLayouts(value:unknown):VisualLayouts{
 const layouts:VisualLayouts={};
 if(!value||typeof value!=='object')return layouts;
 const nested=(value as {formats?:unknown}).formats;
 if(nested&&typeof nested==='object')for(const key of Object.keys(FORMATS) as VisualDocument['format'][]){const parsed=visualSchema.safeParse((nested as Record<string,unknown>)[key]);if(parsed.success&&parsed.data.format===key)layouts[key]=parsed.data;}
 const active=visualSchema.safeParse(value);if(active.success)layouts[active.data.format]=active.data;
 return layouts;
}
export function mergeVisualLayout(previous:unknown,document:VisualDocument){return {...document,formats:{...readVisualLayouts(previous),[document.format]:document}};}
