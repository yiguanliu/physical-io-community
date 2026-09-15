# Veo connection for Physical I/O

Local workflow prepared. Live connection is pending a Gemini API key and a Google project with the required billing/model access. No live video request has been made.

## Connect once
1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey), select or create your project, and create an API key. Enable billing for the project if needed. A Flow subscription alone is not the API connection.
2. Open `.env.veo.local` at the repository root and place your key after `GEMINI_API_KEY=`. Save locally; do not paste the key in chat. The file is excluded from Git, restricted to the local user, and outside the gallery's served folder.
3. Tell Codex “key saved”. Codex can run the read-only connection check. Successful model lookup verifies credentials and visibility; an actual generation is required to verify generation access and billing.

## Reusable commands
From the repository root:

```sh
scripts/video/veo check
scripts/video/veo plan --shot 01
```

The default proposal is one 4-second, 720p, landscape Veo 3.1 Fast clip. Estimated generation cost is US$0.40 using Google's published US$0.10/second rate, checked 14 September 2026. Taxes, currency conversion and future pricing changes are excluded. The local cost limit checks this estimate, not Google's billing system.

When the user authorises the first paid test:

```sh
scripts/video/veo generate --shot 01 --max-cost-usd 0.40
scripts/video/veo status PATH_TO_JOB_JSON
```

Generation submits once and saves its operation ID; `status` polls once and downloads the MP4 when ready. Poll again after a reasonable interval if it remains running. Repeating the same take checks the existing job instead of submitting another paid request. An uncertain submission stops for inspection. To deliberately create a new paid take, change `--take`, for example `--take 02`.

For an 8-second 1080p Fast clip, first plan with `--seconds 8 --resolution 1080p`; the current estimate is US$0.96. Choose `--model standard` for Standard; read the new estimate before submitting. Use `--aspect 9:16` for portrait, ideally with a matching portrait source composition.

## For the next event
Create a prompt-pack JSON containing an array of objects with `shot`, `title`, `starting_image` and `prompt`. Image paths can be absolute or relative to the pack file. Pass `--pack /path/to/pack.json` to `plan` and `generate`. Keep the image clean of typography; add exact branding and dates in the video edit.

This event's six prepared prompts are in `veo-shot-prompts.json`. Original shot durations are edit targets, not necessarily model output durations. Trim generated clips to the storyboard after generation.

The runner writes resumable JSON records and MP4s into a `runs` directory next to the prompt pack. No API key is written to those files. Copy reviewed clips into `visuals/assets/video/` when adding them to the HTML gallery; they are not automatically published or uploaded elsewhere.

## Runtime and verification
The official `google-genai` SDK is installed in `scripts/video/.venv`. Exact installed versions are saved in `scripts/video/requirements.txt`. Recreate with Python 3.10+ using a virtual environment and that requirements file.

Five offline tests passed: plan/resolution rules, cost guard, duplicate prevention, uncertain-submission handling and completion/download handling. SDK image/config/download interfaces were checked locally. Live authentication and generation remain untested until the key is configured.

Official references: [Veo API](https://ai.google.dev/gemini-api/docs/veo), [pricing](https://ai.google.dev/gemini-api/docs/pricing).
