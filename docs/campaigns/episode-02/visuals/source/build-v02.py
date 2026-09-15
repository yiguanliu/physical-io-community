from pathlib import Path
import re,json,html
p=Path(__file__).resolve().parents[1]; e=html.escape
old=(p/'v01/index.html').read_text()
logo=re.search(r'<svg viewBox="0 0 460 271".*?</svg>',old).group()
# Exact typography is kept in HTML/SVG, separate from generated photographs.
glyphs={
'0':['01110','10001','10011','10101','11001','10001','01110'],
'1':['00100','01100','00100','00100','00100','00100','01110'],
'2':['01110','10001','00001','00010','00100','01000','11111'],
'3':['11110','00001','00001','01110','00001','00001','11110'],
'4':['00010','00110','01010','10010','11111','00010','00010'],
'7':['11111','00001','00010','00100','01000','01000','01000'],
'8':['01110','10001','10001','01110','10001','10001','01110'],
'A':['01110','10001','10001','11111','10001','10001','10001'],
'C':['01111','10000','10000','10000','10000','10000','01111'],
'D':['11110','10001','10001','10001','10001','10001','11110'],
'H':['10001','10001','10001','11111','10001','10001','10001'],
'O':['01110','10001','10001','10001','10001','10001','01110'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'S':['01111','10000','10000','01110','00001','00001','11110'],
'T':['11111','00100','00100','00100','00100','00100','00100'],
'Y':['10001','10001','01010','00100','00100','00100','00100'],
'-':['00000','00000','00000','11111','00000','00000','00000'],
' ':['00000']*7}
def dottext(lines):
 svg='<svg class="matrix" viewBox="0 0 60 17" role="img" aria-label="'+e(' / '.join(lines))+'">'
 for row,line in enumerate(lines):
  x=(60-(len(line)*6-1))/2
  y=1 if len(lines)==2 else 5
  y+=row*8
  for i,c in enumerate(line):
   for j,pattern in enumerate(glyphs[c]):
    for k,b in enumerate(pattern):
     if b=='1':svg+=f'<circle cx="{x+i*6+k+.5}" cy="{y+j+.5}" r=".39" fill="#d4d4d4"/>'
 return svg+'</svg>'
shots=[
('01','00–04s','One bit of possibility','A single pale disc turns in a field of black mechanical dots.','100mm macro. Locked-off. Wait for one disc to pivot.','Silence, then one dry mechanical tick.','What makes a body feel alive?','A second click becomes the beginning of the wave.'),
('02','04–09s','A signal acquires weight','A sparse wave travels across a physical flip-dot board.','Tripod locked. Random disc flips; no camera or focus movement.','Individual ticks gather into a short, uneven sequence.','A gesture. A response.','Match the circular discs to a physical rotary control.'),
('03','09–15s','Something to turn','A rotary encoder sits beside a tiny physical display.','Tripod locked. Fixed focus; only three display discs flip.','A single detent click, a low electrical room tone.','An idea becomes an interface.','Hold a beat of black before revealing the material.'),
('04','15–22s','The world answers back','A dark diaphragm bends under an unseen force.','Fixed macro. A narrow reflection reveals a small deformation.','A soft material creak. Let the room tone drop away.','An interface meets resistance. What should it understand?','Match the reflected line into the diffused signal.'),
('05','22–26s','A response, almost','A sparse response appears in a physical flip-dot grid.','Tripod locked. Four mechanical discs flip; no glass or focus pull.','Two isolated ticks with space between them.','Who gets to shape it?','The unresolved dots cut to a legible physical board.'),
('06','26–30s','The invitation arrives','A suspended mechanical display resolves the date and time.','Straight-on static frame. Flip the date first, then the time.','Two restrained bursts of disc clicks. End in silence.','Physical I/O. Love, Mind + Body.','Hold the date and title. No visual fade until the details are readable.')]
posts=json.loads((p/'v01/posts.json').read_text().replace('Love, Intelligence', 'Love, Mind').replace('LOVE, INTELLIGENCE', 'LOVE, MIND'))
styles={
'announcement':('poster-hero-v2','film','Love,<br>Mind + Body','A Physical I/O episode.'),
'builders':('shot-01-v2','quiet','A signal<br>for the curious.','Designers / Engineers<br>Researchers / Founders'),
'sponsors':('shot-03-v2','quiet','Make space<br>for possibility.','A call for partners.'),
'teaser':('shot-05-v2','centre','Is something<br>there?','Love, Mind + Body.'),
'love':('shot-02-v2','quiet','A gesture.<br>A response.','Expression / Connection'),
'body':('shot-04-v2','quiet','The world<br>answers back.','Fabric / Force / Physics'),
'intelligence':('shot-03-v2','quiet','An idea.<br>An interface.','Computing / Power / Tools'),
'speaker':('shot-05-v2','centre','A perspective<br>comes into focus.','[Speaker name]<br>[Confirmed topic]'),
'countdown-7':('shot-06-v2','board','7 days.','The next episode approaches.'),
'countdown-3':('shot-06-v2','board','3 days.','Bring your question.'),
'countdown-24':('shot-06-v2','board','24 hours.','Tomorrow, in the physical world.'),
 'thanks':('poster-hero-v2','film','The signal<br>continues.','Thank you for being part of it.')}
for post in posts:
 post['image'],post['variant'],post['headline'],post['sub']=styles[post['id']]
postlines={'countdown-7':['07 DAYS'],'countdown-3':['03 DAYS'],'countdown-24':['24 HRS']}
def art(post):
 s=f'<div class="art {post["variant"]}" aria-label="{e(post["title"])}"><img src="assets/{post["image"]}.png" alt="" width="1122" height="1402" loading="lazy">'
 if post['variant']=='board':s+='<div class="dotonboard">'+dottext(postlines[post['id']])+'</div>'
 s+=f'<div class="layout"><div class="brandrow"><img class="wordmark" src="assets/physical-io-wordmark.png" alt="Physical I/O" width="2009" height="421">{logo}</div><p class="tag">{post["tag"]}</p><div class="titleblock"><h3>{post["headline"]}</h3><p class="sub">{post["sub"]}</p></div><div class="tail">{post["tail"]}<br>{post["place"]}</div></div></div>'
 return s
base=(p/'v01/gallery.css').read_text()
base=base.replace('--art-orange:#ee4b1a;','')
css=base+'''
/* Episode 02, direction 02: monochrome film / physical interfaces. */
:root{--art-black:#090909;--art-white:#e9e9e9;--art-font:'Rokkitt',Georgia,serif;--art-shade:linear-gradient(180deg,#0007 0%,transparent 40%,transparent 70%,#000a 100%)}
.wui{--ui-bg:#101010;--ui-surface:#171717;--ui-subtle:#1d1d1d;--ui-text:#ededed;--ui-muted:#aaa;--ui-border:#343434;--ui-focus:#fff;--ui-accent:#ddd;--ui-on-accent:#111;color-scheme:dark}
header,main,footer{max-width:1360px}.intro{padding-top:64px;padding-bottom:40px}.intro h1{font:400 clamp(30px,4.1vw,54px)/1.18 var(--art-font);letter-spacing:-.05em}.intro p{max-width:50ch}.brand{font-size:15px;font-weight:500}.brand svg{width:27px}.sectionhead h2{font-size:20px;font-weight:500}.eyebrow,.frame .time{font-family:var(--art-font)}.frame .time{background:#111b;color:#dedede;font-size:12px}.frame .closing{display:none}.boards{gap:36px 24px}.shotinfo h3{font-weight:500}.shotinfo .vo{font-family:var(--art-font);font-size:14px}.shotinfo p,.shotinfo dl{line-height:1.6}.postgrid{gap:36px 24px}.art{font-family:var(--art-font);color:var(--art-white);border:1px solid #333}.art .layout{padding:7.5%}.art .brandrow{font-family:var(--art-font);font-size:2.6cqw;letter-spacing:.02em}.brandrow svg{width:5cqw;height:3.5cqw}.art .tag{margin-top:8cqw;font-size:2.15cqw;letter-spacing:.13em;line-height:1.5}.art .titleblock{margin-top:7cqw}.art h3,.art.hero h3,.art.number h3{font-family:var(--art-font);font-size:5.5cqw;font-weight:400;letter-spacing:-.035em;line-height:1.35;margin:0}.art .sub,.art.hero .sub,.art.number .sub{font-size:2.55cqw;line-height:1.7;margin-top:4cqw;letter-spacing:.01em}.art .tail{font-size:2.2cqw;line-height:1.9;letter-spacing:.03em}.art.film .titleblock{text-align:center;margin-top:4cqw}.art.film .tag{text-align:center;margin-top:7cqw}.art.film h3{font-size:5.2cqw}.art.film .sub{font-size:2.2cqw}.art.film .tail{text-align:center}.art.film:after{background:linear-gradient(180deg,#0002 0%,transparent 70%,#000c 100%)}.art.quiet>img{object-position:center;opacity:.9}.art.quiet .titleblock{margin-top:8cqw}.art.centre .titleblock{position:absolute;left:7.5%;right:7.5%;top:39%;text-align:center;margin:0}.art.centre h3{font-size:5cqw}.art.centre:after{background:linear-gradient(180deg,#0008, #0002 25%,#0007 50%,#0002 75%,#000b)}.art.board>img{position:absolute;left:0;top:27.5%;height:45%;width:100%;object-fit:contain}.art.board:after{display:none}.art.board .titleblock{margin-top:auto;text-align:center;margin-bottom:10cqw}.art.board h3{position:absolute;clip-path:inset(50%);width:1px;height:1px;overflow:hidden}.art.board .tag{text-align:center}.art.board .tail{margin-top:0;text-align:center}.dotonboard{position:absolute;left:14.9%;top:41.27%;width:70.2%;height:16.74%;z-index:1;opacity:.88}.matrix{width:100%;height:100%;display:block;filter:blur(.12px)}.frame .dotonboard{top:30.6%;height:37.2%}.endtitle{position:absolute;top:8%;left:0;right:0;text-align:center;font:400 clamp(10px,1.3vw,17px)/1.5 var(--art-font);letter-spacing:.1em;color:#eee}.endtitle small{display:block;font-size:.7em;margin-top:5px}.postmeta h3{font-weight:500}.postmeta p{line-height:1.7}.notice{border-left:1px solid var(--ui-border);background:transparent;color:var(--ui-muted)}.strip h3{font-family:var(--art-font);font-size:15px;font-weight:400}.strip p{line-height:1.7}.exportonly{background:var(--art-black)}.art.bottom:after{background:var(--art-shade)}
@media(max-width:520px){.intro{padding-top:32px}.art .tag{font-size:2.7cqw}.art .tail{font-size:2.8cqw}.art .brandrow{font-size:3.1cqw}.art .sub{font-size:3cqw}.intro h1{font-size:32px}.endtitle{font-size:11px}}
'''
css+='''
/* Typography refinement: Rokkitt, centred announcement-poster composition. */
@font-face{font-family:'Rokkitt';src:url('assets/fonts/Rokkitt-Variable.ttf') format('truetype');font-weight:100 900;font-style:normal;font-display:swap}
.art .tag,.art .titleblock,.art .sub,.art .tail{text-align:center}
.art:not(.board) .tag{margin-top:7cqw}
.art:not(.board) .titleblock{position:static;margin-top:4cqw}
.art:not(.board) h3{font-size:6.4cqw;line-height:1.15;letter-spacing:0}
.art .sub,.art.film .sub{font-size:2.8cqw}
.art .tag{font-size:2.6cqw}
.art .tail{font-size:2.7cqw}
.intro h1{font-family:var(--art-font);letter-spacing:-.025em}
'''
css+='\n.art .brandrow .wordmark{position:static;width:19cqw;height:auto;object-fit:contain;filter:invert(1);opacity:.92;display:block}\n'
css+='\n.pairedboards{display:block}.shotpair{margin-bottom:44px;border-top:1px solid #333;padding-top:8px}.framepair{display:grid;grid-template-columns:1fr 1fr;gap:20px}.framepair img{width:100%;height:auto;aspect-ratio:16/9;object-fit:contain;display:block}.shotpair h3{font:400 26px Rokkitt,serif}.shotpair .sectionhead{margin-top:20px}@media(max-width:650px){.framepair{grid-template-columns:1fr}}\n'
(p/'gallery.css').write_text(css)
head='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Physical I/O — Monochrome / Direction 02</title><link rel="stylesheet" href="assets/workspace.css"><link rel="stylesheet" href="gallery.css?v=05"></head>'
s=f'''<body class="wui" data-mode="dark"><a class="ui-skip" href="#storyboard">Skip to storyboard</a><header><div class="topline"><div class="brand">{logo} Physical I/O</div><nav aria-label="Gallery sections"><a href="manifesto.html">SVG introduction</a><a href="film-v3.html">Film preview</a><a href="#storyboard">Storyboard</a><a href="#posts">Draft posts</a><a href="#motion">Motion</a><a href="v01/index.html">Previous direction</a></nav></div><div class="intro"><div><p class="eyebrow">EPISODE 02 / VISUAL DIRECTION 02</p><h1>Love, Mind<br>+ Body.</h1><p>A signal becomes physical.<br>Monochrome film. Mechanical dots. A presence just beyond the interface.</p></div><div class="introaside"><p>07 October 2026 · 18:00–21:00 BST<br>Endsleigh Gardens, London</p><p>Six shot studies / Twelve draft posts<br>Concept imagery · Generated with your references</p></div></div></header><main><section id="storyboard"><div class="sectionhead"><h2>01 / A signal becomes physical</h2><p>30 seconds. Six locked shots. First → end frames.</p></div><div class="boards pairedboards">'''
for n,time,title,desc,cam,sound,vo,cut in shots:
 frames=json.loads((p/'storyboard-frames.json').read_text())
 row=next(x for x in frames if x['id']==n)
 s+=f'<article class="shotpair"><div class="sectionhead"><h3>{n} / {e(row["title"])}</h3><p>{time} · LOCKED CAMERA</p></div><div class="framepair">'
 for label,key in [('First frame','first_frame'),('End frame','end_frame')]:
  src=row[key]
  s+=f'<figure><figcaption class="eyebrow">{label}</figcaption><a href="{src}"><img src="{src}" alt="Shot {n}, {label}: {e(row[key.replace("frame","description")])}" width="1672" height="941" loading="lazy"></a></figure>'
 s+=f'</div><p><a href="film-v3.html#shot-{n}">Preview this animation →</a></p><div class="shotinfo"><p>{e(row["motion"])}</p><dl><dt>Camera</dt><dd>Tripod locked. Fixed lens, crop, perspective and focus. No movement.</dd><dt>Sound</dt><dd>{sound}</dd></dl></div></article>'
s+='''</div><p class="notice">The suspense comes from what almost happens. Preserve the grain, physical mechanisms and pauses. These are concept keyframes; the motion and voiceover are production directions.</p></section><section id="posts"><div class="sectionhead"><h2>02 / Quiet invitations</h2><p>4:5 film posters / Exact editable typography / PNG exports</p></div><div class="postgrid">'''
for post in posts:
 id=post['id'];s+=f'''<article class="post">{art(post)}<div class="postmeta"><h3>{e(post['title'])}</h3><p><a href="{id}.html">Open full-size layout</a> · <a href="exports/{id}.png" download>Download PNG</a></p><details><summary>Read draft caption</summary><p>{e(post['caption'])}</p></details></div></article>'''
 (p/f'{id}.html').write_text(head+f'<body class="wui exportonly" data-mode="dark">'+art(post).replace('loading="lazy"','fetchpriority="high"')+'</body></html>')
s+='''</div><p class="notice">Speaker and programme fields remain placeholders. The signup link and exact building/room still need confirmation. Countdown and thank-you layouts are prepared for their future dates.</p></section><section id="motion"><div class="sectionhead"><h2>03 / The motion language</h2><p>Minimal, mechanical, almost silent.</p></div><div class="strip"><article><p class="eyebrow">INTRO / 1.2 SEC</p><h3>One disc turns.</h3><p>A single black disc flips white. A small cluster follows. Cut to the official Physical I/O mark, held quietly in negative space.</p></article><article><p class="eyebrow">TRANSITION / 0.35 SEC</p><h3>A row changes state.</h3><p>One short band of dots flips, obscures the frame and reveals the next shot. Use a dry mechanical tick, with no glow or sweeping light trail.</p></article><article><p class="eyebrow">OUTRO / 4 SEC</p><h3>The board resolves.</h3><p>The date arrives before the time. Let the clicks stop. Hold the board and small episode title. The next action is added when booking is ready.</p></article></div></section></main><footer><span>Physical I/O · Monochrome direction 02 · Film grain / Flip-dot / Physical interface</span><a href="prompts-v02.json">Generation prompts & provenance</a></footer></body></html>'''
(p/'index.html').write_text(head+s)
(p/'posts.json').write_text(json.dumps(posts,indent=2))
(p/'storyboard-v02.json').write_text(json.dumps([dict(zip(['id','time','title','description','camera','sound','voiceover','transition'],x)) for x in shots],indent=2))
print('Direction 02 gallery built.')
