#!/usr/bin/env python3
"""Local Veo image-to-video runner. API keys never enter the HTML gallery."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PACK = ROOT / 'docs/campaigns/episode-02/video/veo-shot-prompts.json'
KEY_FILE = ROOT / '.env.veo.local'
MODELS = {'fast': 'veo-3.1-fast-generate-preview', 'standard': 'veo-3.1-generate-preview'}
RATES = {'fast': {'720p': .10, '1080p': .12}, 'standard': {'720p': .40, '1080p': .40}}

def key():
    value = os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')
    if not value and KEY_FILE.exists():
        for line in KEY_FILE.read_text().splitlines():
            name, sep, candidate = line.partition('=')
            if sep and name.strip() == 'GEMINI_API_KEY':
                value = candidate.strip().strip('\"\'')
                break
    if not value or value == 'PASTE_YOUR_KEY_HERE':
        raise ValueError('Gemini key missing. Set GEMINI_API_KEY in .env.veo.local, not in chat.')
    return value

def client():
    from google import genai
    from google.genai import types
    return genai.Client(api_key=key(), vertexai=False,
        http_options=types.HttpOptions(timeout=120000,
        retry_options=types.HttpRetryOptions(attempts=1)))

def plan(args):
    pack = Path(args.pack).resolve()
    rows = json.loads(pack.read_text())
    row = next((r for r in rows if r['shot'] == args.shot.zfill(2)), None)
    if row is None:
        raise ValueError('Shot not found in prompt pack.')
    image = Path(row['starting_image'])
    if not image.is_absolute():
        image = (pack.parent / image).resolve()
    if not image.is_file():
        raise ValueError('Starting-frame image not found.')
    if image.suffix.lower() not in ('.png', '.jpg', '.jpeg'):
        raise ValueError('Use a PNG or JPEG starting frame.')
    if args.resolution == '1080p' and args.seconds != 8:
        raise ValueError('1080p requires an 8-second generation.')
    job = dict(shot=row['shot'], title=row['title'], starting_image=str(image),
        image_sha256=hashlib.sha256(image.read_bytes()).hexdigest(), prompt=row['prompt'],
        model=MODELS[args.model], resolution=args.resolution, seconds=args.seconds,
        aspect_ratio=args.aspect, estimated_cost_usd=round(RATES[args.model][args.resolution]*args.seconds, 2),
        price_checked='2026-09-14', pricing_source='https://ai.google.dev/gemini-api/docs/pricing')
    if row.get('end_image'):
        end = Path(row['end_image'])
        if not end.is_absolute(): end = (pack.parent / end).resolve()
        if not end.is_file(): raise ValueError('End frame not found.')
        job['end_image'] = str(end)
        job['end_image_sha256'] = hashlib.sha256(end.read_bytes()).hexdigest()
    job['negative_prompt'] = row.get('negative_prompt')
    return job

def save(path, record):
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(record, indent=2))
    temporary.replace(path)

def poll(api, path):
    from google.genai import types
    record = json.loads(path.read_text())
    if record.get('state') == 'complete':
        print('Already downloaded:', record['output'])
        return
    if not record.get('operation'):
        raise ValueError('Submission has no operation ID. Do not retry automatically; check Google usage first.')
    operation = api.operations.get(types.GenerateVideosOperation(name=record['operation']))
    if not operation.done:
        record['state'] = 'running'; save(path, record)
        print('Still generating. Run status again with this job file:', path)
        return
    if operation.error:
        record['state'] = 'failed'; record['error_code'] = operation.error.get('code')
        save(path, record)
        raise ValueError('Google reported a generation failure. No new request was submitted.')
    videos = operation.response.generated_videos if operation.response else None
    if not videos:
        record['state'] = 'no_video'; save(path, record)
        raise ValueError('No video was returned; it may have been filtered. No retry was submitted.')
    output = path.with_suffix('.mp4')
    temporary = path.with_suffix('.partial.mp4')
    api.files.download(file=videos[0].video, destination=str(temporary))
    if temporary.stat().st_size == 0:
        raise ValueError('Download was empty; use status to retry only the download.')
    temporary.replace(output)
    record.update(state='complete', output=str(output), completed_at=datetime.now(timezone.utc).isoformat())
    save(path, record)
    print('Video saved:', output)

def generate(args):
    from google.genai import types
    job = plan(args)
    if args.max_cost_usd is None or not math.isfinite(args.max_cost_usd) or job['estimated_cost_usd'] > args.max_cost_usd:
        raise ValueError('Set --max-cost-usd to cover the displayed estimate before submitting. Provider pricing may change.')
    api = client()  # Validate local credentials before reserving the request record.
    fingerprint = hashlib.sha256(json.dumps(job, sort_keys=True).encode()).hexdigest()[:12]
    if not args.take.isalnum() or len(args.take)>24:
        raise ValueError('Take must be 1–24 letters or digits.')
    directory = Path(args.pack).resolve().parent / 'runs'; directory.mkdir(exist_ok=True)
    path = directory / f"shot-{job['shot']}-{fingerprint}-take-{args.take}.json"
    record = dict(job, state='submitting', submitted_at=datetime.now(timezone.utc).isoformat())
    try:
        with path.open('x') as f:
            json.dump(record, f, indent=2)
    except FileExistsError:
        print('Existing take found. No new paid request submitted.')
        poll(api, path)
        return
    try:
        image = types.Image(image_bytes=Path(job['starting_image']).read_bytes(),
            mime_type='image/png' if job['starting_image'].endswith('.png') else 'image/jpeg')
        end = types.Image(image_bytes=Path(job['end_image']).read_bytes(), mime_type='image/png') if job.get('end_image') else None
        operation = api.models.generate_videos(model=job['model'], source=types.GenerateVideosSource(prompt=job['prompt'], image=image),
            config=types.GenerateVideosConfig(number_of_videos=1, duration_seconds=job['seconds'],
                aspect_ratio=job['aspect_ratio'], resolution=job['resolution'], last_frame=end, negative_prompt=job.get('negative_prompt')))
    except Exception as exc:
        record['state'] = 'rejected' if getattr(exc, 'code', None) == 429 else 'submission_unconfirmed'
        record['error_code'] = getattr(exc, 'code', None)
        if getattr(exc, 'code', None) in (400, 429):
            record['error_summary'] = str(exc).replace(key(), '[REDACTED]')[:3000]
        save(path, record)
        print('Submission outcome uncertain. Job retained; do not resubmit blindly:', path, file=sys.stderr)
        raise
    if not operation.name:
        record['state']='submission_unconfirmed';save(path, record)
        raise ValueError('Provider returned no operation ID; inspect account usage before a new take.')
    record.update(state='running', operation=operation.name); save(path, record)
    print('Submitted one video. Job file:', path)
    print('Use status with this file to check progress and download when ready.')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    sub.add_parser('check', help='Check credentials/model visibility without generating video')
    for name in ('plan','generate'):
        cmd=sub.add_parser(name)
        cmd.add_argument('--pack', default=str(DEFAULT_PACK))
        cmd.add_argument('--shot', default='01')
        cmd.add_argument('--model',choices=MODELS,default='fast')
        cmd.add_argument('--seconds',type=int,choices=[4,6,8],default=4)
        cmd.add_argument('--resolution',choices=['720p','1080p'],default='720p')
        cmd.add_argument('--aspect',choices=['16:9','9:16'],default='16:9')
        if name=='generate':
            cmd.add_argument('--max-cost-usd',type=float)
            cmd.add_argument('--take',default='01')
    cmd=sub.add_parser('status',help='Poll once; download the completed clip without resubmitting')
    cmd.add_argument('job_file',type=Path)
    args=parser.parse_args()
    if args.command=='plan':print(json.dumps(plan(args),indent=2))
    elif args.command=='generate':generate(args)
    elif args.command=='status':poll(client(),args.job_file.resolve())
    else:
        api=client()
        result=api.models.get(model=MODELS['fast'])
        print('Credentials accepted. Model visible:', result.name)
        print('Billing and video-generation permission remain unverified until a generation succeeds.')

if __name__=='__main__':
    try:main()
    except (ValueError, FileNotFoundError, json.JSONDecodeError) as err:
        print(str(err),file=sys.stderr);sys.exit(1)
    except Exception as err:
        # Provider exceptions can include request details. Never echo raw payloads or credentials.
        print('Provider/setup error:',type(err).__name__, 'code:',getattr(err,'code','unavailable'),file=sys.stderr)
        print('Check credentials, billing, model access and network. No automatic retry.',file=sys.stderr)
        sys.exit(1)
