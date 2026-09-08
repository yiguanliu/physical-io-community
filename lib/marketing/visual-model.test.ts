import { describe,it,expect } from 'vitest';
import { makeLayer,initialVisual,resizeVisual,visualSchema,FORMATS,posterVisual,upgradeTemplatePoster,readVisualLayouts,mergeVisualLayout } from './visual-model';
import { marketingCommand } from './contracts';
describe('visual documents',()=>{
 it('keeps normalized layer placement when changing aspect ratio',()=>{const doc=initialVisual('Robotics news');const resized=resizeVisual(doc,1200,627);expect(resized.layers[2].x/1200).toBeCloseTo(doc.layers[2].x/1080);expect(resized.layers[2].y/627).toBeCloseTo(doc.layers[2].y/1350);expect(visualSchema.safeParse(resized).success).toBe(true);});
 it('preserves logo proportions across format switches and back',()=>{const doc=initialVisual('Story');const wide=resizeVisual(doc,1600,900);expect(wide.layers[0].width/wide.layers[0].height).toBeCloseTo(doc.layers[0].width/doc.layers[0].height);const back=resizeVisual(wide,doc.width,doc.height);expect(back.layers[0].width).toBeCloseTo(doc.layers[0].width);expect(back.layers[0].height).toBeCloseTo(doc.layers[0].height);});
 it('rejects unsafe media, oversized canvases and duplicate layer IDs',()=>{const doc=initialVisual('Story');expect(visualSchema.safeParse({...doc,width:9000}).success).toBe(false);expect(visualSchema.safeParse({...doc,layers:[{...doc.layers[0],type:'image',src:'javascript:alert(1)'}]}).success).toBe(false);expect(visualSchema.safeParse({...doc,layers:[doc.layers[0],doc.layers[0]]}).success).toBe(false);});
 it('requires a saved version before a destructive or visual update',()=>{expect(marketingCommand.safeParse({action:'delete',id:'story'}).success).toBe(false);expect(marketingCommand.safeParse({action:'visual',id:'story',document:initialVisual('Story')}).success).toBe(false);expect(marketingCommand.safeParse({action:'category',name:'   '}).success).toBe(false);});
});

describe('poster typography',()=>{
 it('does not shrink type cumulatively when switching formats',()=>{const original=initialVisual('Story');let doc=original;for(let n=0;n<10;n++)for(const format of Object.values(FORMATS))doc=resizeVisual(doc,format.width,format.height);doc=resizeVisual(doc,original.width,original.height);doc.layers.forEach((l,i)=>expect(l.fontSize).toBeCloseTo(original.layers[i].fontSize));});
 it('builds valid photo posters with readable type in every format',()=>{for(const format of Object.keys(FORMATS) as (keyof typeof FORMATS)[]){const doc=posterVisual('robotics',format,'https://example.com');expect(visualSchema.safeParse(doc).success).toBe(true);expect(doc.layers[0].type).toBe('image');const headline=doc.layers.find(l=>l.name==='Headline')!;expect(headline.fontSize/Math.min(doc.width,doc.height)).toBeGreaterThan(.08);expect(headline.y+headline.height).toBeLessThan(doc.height);}});
 it('upgrades generated starters without replacing custom artwork',()=>{const title='Template · Episode 02 announcement';const doc=initialVisual(title);expect(upgradeTemplatePoster(doc,title,'https://example.com').layers[0].type).toBe('image');doc.layers[2].text='My own headline';expect(upgradeTemplatePoster(doc,title,'https://example.com')).toBe(doc);});
});

describe('independent format storage',()=>{
 it('keeps the legacy saved layout when first saving another format',()=>{const square=posterVisual('robotics','post','https://example.com');const portrait=posterVisual('gathering','instagram','https://example.com');const saved=mergeVisualLayout(square,portrait);expect(readVisualLayouts(saved)).toEqual({post:square,instagram:portrait});});
 it('updates only the format being saved',()=>{const square=posterVisual('robotics','post','https://example.com'),portrait=posterVisual('gathering','instagram','https://example.com');const initial=mergeVisualLayout(square,portrait),edited={...square,background:'#123456'};const saved=mergeVisualLayout(initial,edited);expect(readVisualLayouts(saved).instagram).toEqual(portrait);expect(readVisualLayouts(saved).post).toEqual(edited);expect(initial.formats.post).toEqual(square);});
 it('ignores corrupt or mismatched stored formats',()=>{const doc=initialVisual('Story');expect(readVisualLayouts({formats:{post:doc,x:{bad:true}}})).toEqual({});});
});

describe('layer effects',()=>{
 it('loads older layouts with clean, sharp text',()=>{const doc=initialVisual('Legacy');const old={...doc,layers:doc.layers.map(({roughness,blur,rgbShift,...layer})=>layer)};const loaded=visualSchema.parse(old);expect(loaded.layers.every(l=>l.roughness===0&&l.blur===0&&l.rgbShift===0)).toBe(true);});
 it('persists effects separately per format and rejects invalid intensities',()=>{const original=initialVisual('Story');const rough={...original,layers:original.layers.map(l=>({...l,roughness:12,blur:2.5,rgbShift:6}))};const saved=mergeVisualLayout(original,visualSchema.parse(rough));expect(readVisualLayouts(saved).instagram?.layers[2].roughness).toBe(12);expect(readVisualLayouts(saved).instagram?.layers[2].blur).toBe(2.5);expect(readVisualLayouts(saved).instagram?.layers[2].rgbShift).toBe(6);expect(visualSchema.safeParse({...rough,layers:[{...rough.layers[0],rgbShift:31}]}).success).toBe(false);expect(visualSchema.safeParse({...rough,layers:[{...rough.layers[0],roughness:31}]}).success).toBe(false);expect(visualSchema.safeParse({...rough,layers:[{...rough.layers[0],blur:-1}]}).success).toBe(false);});
});

describe('background grain',()=>{
 it('defaults legacy canvases to no grain',()=>{const {grain,grainSize,...old}=initialVisual('Legacy');expect(visualSchema.parse(old).grain).toBe(0);expect(visualSchema.parse(old).grainSize).toBe(2);});
 it('preserves texture settings per format and bounds controls',()=>{const doc={...initialVisual('Grunge'),grain:.45,grainSize:4};const saved=mergeVisualLayout(null,visualSchema.parse(doc));expect(readVisualLayouts(saved).instagram?.grain).toBe(.45);expect(readVisualLayouts(saved).instagram?.grainSize).toBe(4);expect(visualSchema.safeParse({...doc,grain:2}).success).toBe(false);expect(visualSchema.safeParse({...doc,grainSize:0}).success).toBe(false);});
});

describe('new text defaults',()=>{
 it('uses the requested projector treatment for new text only',()=>{const text=makeLayer('text');expect([text.rgbShift,text.roughness,text.blur]).toEqual([1,4,1.5]);for(const type of ['image','shape','logo'] as const){const layer=makeLayer(type);expect([layer.rgbShift,layer.roughness,layer.blur]).toEqual([0,0,0]);}});
 it('allows explicit effect overrides',()=>{const text=makeLayer('text',{rgbShift:0,roughness:0,blur:0});expect([text.rgbShift,text.roughness,text.blur]).toEqual([0,0,0]);});
});
