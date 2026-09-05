import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrast, themeColors, defaultTheme, minimalTheme } from './theme';
test('arbitrary accent foregrounds meet AA text contrast across sampled RGB space', () => {
 for(let r=0;r<256;r+=17) for(let g=0;g<256;g+=17) for(let b=0;b<256;b+=17) {
  const accent='#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('');
  const colors = themeColors(accent);
  assert.ok(contrast(accent,colors.onAccent)>=4.5,accent);
  assert.equal(colors.onAction, '#ffffff');
  assert.ok(contrast(colors.action, colors.onAction)>=4.5, accent);
  assert.ok(contrast(colors.actionHover, colors.onAction)>=4.5, accent);
 }
});
test('invalid accents fall back and black-white contrast is 21',()=>{
 assert.equal(themeColors('invalid').accent,defaultTheme.accent); assert.equal(contrast('#000000','#ffffff'),21);
});
test('light and dark semantic text, status, control, and focus pairs meet contrast thresholds',()=>{
 const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
 const light=css.match(/\.wui\{([^}]+)/)![1]; const dark=css.match(/\.wui\[data-mode=dark\]\{([^}]+)/)![1];
 const minimal = css.match(/\.wui\[data-palette=minimal\]\{([^}]+)/)![1];
 const minimalDark = css.match(/\.wui\[data-palette=minimal\]\[data-mode=dark\]\{([^}]+)/)![1];
 for(const block of [light,dark,minimal,minimalDark]) {
  const tokens=Object.fromEntries([...block.matchAll(/--ui-([\w-]+):(#[\da-f]{6})/g)].map(m=>[m[1],m[2]]));
  for(const bg of ['bg','surface','subtle']) for(const fg of ['text','muted']) assert.ok(contrast(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg}`);
  for(const status of ['success','warning','danger']) assert.ok(contrast(tokens[status],tokens[`${status}-bg`])>=4.5,status);
  for(const bg of ['bg','surface']) for(const fg of ['control','focus']) assert.ok(contrast(tokens[fg],tokens[bg])>=3,`${fg}/${bg}`);
 }
});

test('minimal preset uses a neutral action with white text', () => {
 assert.equal(minimalTheme.palette, 'minimal');
 assert.equal(themeColors(minimalTheme.accent).onAction, '#ffffff');
 assert.ok(contrast(themeColors(minimalTheme.accent).action, '#ffffff') >= 4.5);
});

 test('both dark palettes share neutral foundations without a color cast',()=>{
  const css=readFileSync(new URL('./styles.css',import.meta.url),'utf8');
  const blocks=[css.match(/\.wui\[data-mode=dark\]\{([^}]+)/)![1],css.match(/\.wui\[data-palette=minimal\]\[data-mode=dark\]\{([^}]+)/)![1]];
  for(const key of ['bg','surface','subtle','text','muted','border','control','focus']){
   const values=blocks.map(block=>block.match(new RegExp('--ui-'+key+':(#[a-f0-9]{6})'))![1]);
   assert.equal(values[0],values[1],key);
   const rgb=values[0].slice(1).match(/../g)!;assert.equal(rgb[0],rgb[1],key);assert.equal(rgb[1],rgb[2],key);
  }
 });
