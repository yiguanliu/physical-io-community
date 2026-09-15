# Repeatable event campaign runbook

## Working record
Each campaign has a confirmed brief, calendar, asset ledger, copy pack, distribution/sponsor list and results log. Each item has an ID, owner, due date, status, dependency, source asset, approved copy, platform variant and eventual live URL. Start at draft; do not mark scheduled/published without an actual tool or human confirmation.

Suggested roles, all currently unassigned: campaign lead owns facts and release decisions; editor owns cuts and captions; partner lead owns sponsors and channel relationships; event producer owns logistics and recording.

## Run stages
1. **Intake:** confirm date/time/timezone, venue, audience, central question, registration, budget, roles, speakers, partners, brand assets and recordings. Separate confirmed facts from proposals.
2. **Story:** connect the previous episode to the next. Create manifesto/recap, central question, three topic chapters and one CTA per asset.
3. **Plan:** anchor dates to event day; retain all 27 beats but combine or make optional where programme or capacity demands it. Schedule production before release.
4. **Source:** log footage path, timecode in/out, speaker, transcript, factual context, rights/permission, framing and selected cut. A speaker script is not proof of what was said.
5. **Produce:** motion kit → master edit → six excerpt cuts → next-event teaser → practical announcement → confirmed reveals. Export captions and clean masters; check readable text and speech on a phone-sized preview.
6. **Distribute:** adapt to active accounts, use one confirmed booking destination, create trackable links, prepare reshare text. Check links and facts before release. Send/post only with authority covering the action; record actual outcomes.
7. **Capture:** assign camera/audio owner, obtain recording consent, test microphones and storage, record clean talks and 10-second establishing shots, capture three approved member interviews. Keep visual-only material out of audio cuts unless narrated.
8. **Follow through:** closing → thanks → recap → testimonials → interviews → full video/audio → speaker cuts → member feedback. Post only formats actually produced.
9. **Learn:** compare registrations, attendance and feedback against the agreed target. Record what changed and why; update skill references only with reusable lessons.

## Event-day capture plan — 7 October
17:00 proposed crew setup, subject to venue access. Check power, sound, storage and release process. Confirm programme before assigning talk capture times.
17:45 proposed arrival coverage, subject to actual doors time. Capture venue/wayfinding without exposing private check-in lists.
18:00–21:00 confirmed event window. Capture clean speaker audio, contextual demo shots, audience questions and approved human reactions. One producer selects live story moments while recording continues.
After programme: three short interviews: “What surprised you?”, “What will you try next?”, “Who would benefit from the next event?” Confirm names and permission for attribution.
After venue wrap: duplicate originals, verify copies, log good moments and hand off to editor.

## Measurement
Set capacity, registration target, expected attendance and production budget with the organiser; no numerical promises yet.
- Registration conversion = completed registrations / tracked landing visits, only where those sources can be measured consistently.
- Show-up rate = checked-in attendees / confirmed registrations, with denominator definition recorded.
- Track sponsor responses and meetings separately from money committed.
- Record views, meaningful replies, saves and shares by platform without treating unlike definitions as comparable.
- At D−7 and D−3, review booking pace and unanswered logistics questions. Improve the relevant message/channel rather than increasing every channel’s frequency.
- At D+14, ask what people learned, who they connected with, what was missing and whether they want to return. Keep anecdotes distinct from measured outcomes.
- Use utm_campaign=physical_io_ep02_20261007, utm_source per channel, utm_medium=social/community/email and utm_content per item. Preserve the booking URL’s existing query parameters. Do not imply attribution is available until verified.

## Process log — this run
- 14 Sep: translated the user’s 27 beats into a lifecycle and draft library; separated Episode 01 proof from Episode 02 invitation.
- Read repository about/home copy and marketing/sponsor workflow notes. These describe existing conventions; live implementation was not audited or changed.
- Received event date, time and street from user; inferred 2026 from context/weekday.
- Checked supplied Luma page: it is the past online Manifesto event. Kept Episode 02 signup unresolved.
- Found original Manifesto recording, speaker script, posters, name cards, branding and owl animation in the user folder. Read host script; footage has not yet been watched/transcribed or cut.
- Adjusted recap guidance from physical-room footage to online speaker/deck/Q&A footage.
- Prepared dated calendar, copy, production briefs, sponsor drafts and reusable skill. Nothing sent, published or scheduled.

## Source asset ledger
| Asset | Path | State / next step |
|---|---|---|
| Manifesto recording | /Users/yiguanliu/Documents/Physical-IO/#1 - Manifesto/Video/#1 Physical I_O_ Manifesto - 2026_08_20 17_47 BST - Recording.mp4 | Located; review/transcribe for exact timecodes |
| Host script | /Users/yiguanliu/Documents/Physical-IO/#1 - Manifesto/Physical I_O Manifesto — Speaker Script.md | Read; narrative reference, not a recording transcript |
| Posters | /Users/yiguanliu/Documents/Physical-IO/#1 - Manifesto/Poster | Located; visual review pending |
| Name cards | /Users/yiguanliu/Documents/Physical-IO/0817-guest speaker post | Located; historical roles need recheck |
| Brand files | /Users/yiguanliu/Documents/Physical-IO/Branding | Located; inspect before final design |
| Owl motion | /Users/yiguanliu/Documents/Physical-IO/Branding/owl-ohi-flyin.mp4 | Located; inspect for reusable sting |
| Previous event page | https://luma.com/9npo83bq | Verified online event 20 August 2026; not the new signup URL |

Do not reuse historical audience statistics or hiring claims from the host script as current evidence. Luma’s “Went” count is not independently checked attendance.

- Installed the reusable skill at /Users/yiguanliu/.codex/skills/physical-io-event-campaign; calendar completeness and countdown dates checked.

- Visual production: generated 6 storyboard keyframes and 1 portrait key art with the built-in image tool; saved exact prompts in visuals/prompts.json. Composed 12 posts using editable HTML type and the official SVG mark. Exported 12 PNGs at 1080×1350. Checked the gallery in Chrome at 1440px and 390px, light/dark, and caption disclosure; no page errors or horizontal overflow. Images are conceptual; no event claims or speaker likenesses invented.

- Art-direction revision 02: user requested monochrome film grain, minimal abstract physical interfaces and flip-dot boards. Generated seven new reference-guided images, revised all six shots and twelve post compositions, and exported twelve PNGs. Kept direction 01 for comparison. Checked Chrome at 1440px and 390px, image loads, captions and no horizontal overflow; no page errors. Current direction recorded in art-direction-v02.md.

- Veo API preparation: user chose Gemini API. Installed isolated official google-genai SDK, built scripts/video/veo with plan/check/generate/status, prepared six motion prompts, private ignored key-file placeholder and setup instructions. Five offline workflow tests pass. No Gemini key was present; live authentication/generation remain pending. Default first test: 4s 720p Veo Fast, estimated US$0.40 at checked pricing.

### Typography refinement — 14 September 2026
Updated the episode title to Love, Mind + Body, bundled Rokkitt with its OFL license, and centred all poster copy using the announcement layout. Rebuild with visuals/source/build-v02.py, wait for local fonts before exporting, then verify desktop/mobile layouts and all twelve PNGs. Retain dot-matrix countdown characters on the hardware display.

### Supplied wordmark — 14 September 2026
Replaced top-left poster text with the supplied transparent Physical I/O wordmark, displayed white on dark artwork. The original asset is retained in visuals/assets/physical-io-wordmark.png; the builder applies it consistently to all twelve posters. Refreshed and visually checked exports.

### Veo motion cut — 14 September 2026
Generated all six starting-image shots with Veo 3.1 Fast at 720p. Source durations 4/6/6/8/4/4 seconds; edit durations 4/5/6/7/4/4 seconds. Estimated successful generation cost: $3.20. Shot 04 initially received HTTP 429 and was accepted after the rate limit cleared; its first record has no operation ID. Retain all records to prevent duplicate submissions.

Run scripts/video/assemble.py with the local video environment to rebuild edited clips and visuals/film.html from completed jobs. Render video/end-overlay.html at 1280×720 with transparent background and wait for Rokkitt before assembly. Exact title and event details are composited separately from generated footage. Final cut is sound-led, without voiceover; shot 03 contains an unintended hand and is explicitly flagged as a review take. Preview provides native controls, individual downloads, a full-film player and pauses other players when one starts.

Verified all seven players play in Chrome, final duration 30.02 seconds (30-second picture plus audio padding), 1280×720, and no mobile horizontal overflow. Source MP4s and job records remain under video/runs; review exports under visuals/video.

### Paired storyboard revision — 14 September 2026
Changed storyboard mode to a first/end frame grid for all six shots. Built-in image generation edited all-black starting frames for shots 01, 02, 03 and 05, relaxed the diaphragm for shot 04, rebuilt shot 05 as physical flip-dot hardware using shot 06 as reference, and generated shot 06's 07 OCT / 18-21 end frame. Existing shots 01–04 images remain their end frames; shot 06's existing blank board remains its first frame. Exact paired paths and motion briefs: visuals/storyboard-frames.json. New Veo pack: video/veo-shot-prompts-v3.json. No camera motion or focus pulls are allowed. Both endpoints supplied to Veo; eight-second generations retimed in full to 4/5/6/7/4/4 seconds to preserve the end states. Earlier films retained for comparison.

Revised pass completed: six accepted eight-second Veo Fast jobs, estimated $4.80. Six edited shots plus the 30.008-second film verified to play at 1280×720; all twelve storyboard images load and mobile has no horizontal overflow. Revised shot 03 has no hand; sampled shot 06 end frame retains legible date/time. Updated installed campaign skill with the endpoint workflow.

### Individual-dot correction
Shots 05 and 06: only individual target discs may rotate on their existing axles. Every unused dot remains black and stationary; the board, disc centers, camera, focus and light stay fixed. No whole-surface morph, wave, dissolve or displacement. Prompts saved in video/veo-shot-prompts-v4.json and displayed in film-v3.html. Both regeneration requests were explicitly rejected with HTTP 429 RESOURCE_EXHAUSTED (quota). No accepted operation IDs and no new output clips; previous takes remain labelled in the gallery.

### SVG community introduction — 15 September 2026
Created manifesto.html and manifesto.js: a local GSAP/SVG 30-second introduction with five chapters, fixed camera, thin outlines, digital cells and material mesh. Uses the supplied wordmark and Rokkitt title font. Silent draft with visible narration and transcript. Supports play/pause, restart, scrubbing, chapter jumps, fullscreen, keyboard playback and reduced-motion initial pause. Verified 30-second duration, all chapter renders, playback controls and mobile overflow in Chrome. Rebuild markup with visuals/source/build-manifesto.py. GSAP bundled locally; no external video API or generation cost.
