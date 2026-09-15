"""Build a 30-second review edit and its HTML preview from completed Veo jobs."""
import json, subprocess, shutil, html
from pathlib import Path
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'docs/campaigns/episode-02'
OUT=BASE/'visuals/video-v3'; OUT.mkdir(exist_ok=True)
FF=imageio_ffmpeg.get_ffmpeg_exe()
rows=json.loads((BASE/'video/veo-shot-prompts-v3.json').read_text())
durations=[4,5,6,7,4,4]
def run(args):
 subprocess.run([FF,'-hide_banner','-loglevel','error','-y',*args],check=True)
ready=[]
for row,duration in zip(rows,durations):
 n=row['shot']; matches=[]
 for p in (BASE/'video/runs').glob(f'shot-{n}-*.json'):
  job=json.loads(p.read_text())
  if job.get('state')=='complete' and job.get('end_image') and job.get('image_sha256'):
   if job.get('starting_image')==row['starting_image']:matches.append((p,job))
 if not matches:continue
 p,job=matches[-1]
 target=OUT/f'shot-{n}.mp4'
 run(['-i',job['output'],'-t',str(duration),'-vf',f'setpts={duration/8}*PTS,scale=1280:720,setsar=1,fps=24,format=yuv420p','-af',f'atempo={8/duration}','-c:v','libx264','-crf','18','-c:a','aac','-ar','48000','-ac','2','-movflags','+faststart',str(target)])
 ready.append(n)
if len(ready)==6:
 overlay=OUT/'end-overlay.png'
 if overlay.exists():
  run(['-i',str(OUT/'shot-06.mp4'),'-i',str(overlay),'-filter_complex','[0:v][1:v]overlay=0:0:enable=gte(t\\,0.3)[v]','-map','[v]','-map','0:a?','-c:v','libx264','-crf','18','-c:a','copy','-movflags','+faststart',str(OUT/'shot-06-titled.mp4')])
 listing=OUT/'concat.txt'
 listing.write_text(''.join("file '"+('shot-06-titled.mp4' if n=='06' and overlay.exists() else f'shot-{n}.mp4')+"'\n" for n in ready))
 run(['-f','concat','-safe','0','-i',str(listing),'-c','copy','-movflags','+faststart',str(OUT/'love-mind-body-30s.mp4')])
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Love, Mind + Body — film preview</title><link rel="stylesheet" href="assets/workspace.css"><link rel="stylesheet" href="gallery.css?v=04"><style>main{max-width:1200px;padding:32px}h1{font:400 clamp(36px,6vw,70px)/1.1 Rokkitt,serif}video{width:100%;aspect-ratio:16/9;background:#050505;display:block} .clips{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:36px 24px}h2{margin:32px 0 16px}h3{font:400 25px Rokkitt,serif;margin:14px 0 8px}.muted{color:#aaa;line-height:1.6}a{text-underline-offset:4px}.master{margin:32px 0 48px}details{margin-top:12px}summary{cursor:pointer}@media(max-width:650px){.clips{grid-template-columns:1fr}main{padding:20px}}</style><body class="wui" data-mode="dark"><main><a href="index.html">← Storyboard & posters</a><p class="eyebrow" style="margin-top:36px">PHYSICAL I/O · EPISODE 02 · LOCKED CAMERA CUT</p><h1>Love, Mind + Body</h1><p class="muted">Six shots. Thirty seconds. Black-and-white physical interfaces.<br>First/end frame animation · Locked camera brief · No voiceover · Press play to hear the generated sound.</p>'''
if (OUT/'love-mind-body-30s.mp4').exists():
 page+='''<section class="master"><h2>The 30-second film</h2><video controls playsinline preload="metadata" poster="assets/shot-01-first-v3.png" src="video-v3/love-mind-body-30s.mp4" aria-label="Complete thirty-second film"></video><p><a href="video-v3/love-mind-body-30s.mp4" download>Download the film</a></p></section>'''
else:page+='<p class="muted">The full edit will appear here once all six shots are ready.</p>'
page+='<h2>Cut by cut</h2><div class="clips">'
for row,d in zip(rows,durations):
 n=row['shot'];page+=f'<article id="shot-{n}"><p class="eyebrow">SHOT {n} · {row["edit_duration"]} · {d} SEC</p>'
 if n in ready:page+=f'<video controls playsinline preload="metadata" poster="assets/shot-{n}-first-v3.png" src="video-v3/shot-{n}.mp4" aria-label="Shot {n}: {html.escape(row["title"])}"></video>'
 else:page+=f'<img src="assets/shot-{n}-v2.png" alt="Starting image" style="width:100%"><p>Generation pending.</p>'
 page+=f'<h3>{html.escape(row["title"])}</h3>'
 if n in ready:page+=f'<a href="video-v3/shot-{n}.mp4" download>Download shot {n}</a>'
 if False:page+='<p class="muted">Review note: Veo introduced a hand turning the control. This take departs from the intended hardware-only frame.</p>'
 page+=f'<details><summary>Motion brief</summary><p class="muted">{html.escape(row["prompt"])}</p></details></article>'
page+='''</div><p class="muted" style="margin-top:40px">AI-generated concept footage. Event: 7 October 2026 · 18:00–21:00 BST · Endsleigh Gardens, London.</p></main><script>document.querySelectorAll('video').forEach(v=>v.addEventListener('play',()=>document.querySelectorAll('video').forEach(other=>{if(other!==v)other.pause()})));</script></body></html>'''
(BASE/'visuals/film-v3.html').write_text(page)
print('Film gallery updated. Completed shots:',', '.join(ready))
