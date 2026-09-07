# I/O community robot

The existing Next.js homepage now hosts I/O: a Vercel AI SDK ToolLoopAgent using OpenAI, not an Eve runtime. The existing server stack is retained; no separate agent server, database or durable-session deployment is required.

## Runtime

- `lib/robot/agent.ts`: model, instructions, readCommunity tool and bounded structured performance output.
- `lib/robot/community.ts`: curated public memory from the founder brand brief and `Physical I_O Manifesto — Speaker Script.md`. Update here when community facts change. Dates, member lists and private records are not included. Event availability links to Luma; the agent does not fetch a live calendar.
- `components/RobotExperience.tsx`: conversation history (in memory for the tab), quick actions, microphone recording and speech playback.
- `components/contact-scene.js`: LED text, brand sequence, faces and head gestures. These are bounded visual commands; the model cannot execute JavaScript or access devices.
- `/api/robot/chat`, `/speech`, `/transcribe`: server-side provider requests. `OPENAI_API_KEY` stays in ignored `.env.local`. Optional `ROBOT_MODEL` overrides the default.

Click **Talk to I/O**, permit the microphone, then **Send voice**. Recording stops at 30 seconds. Voice messages go to OpenAI transcription, then the conversation agent, then OpenAI speech generation. Spoken replies can also be enabled for typed messages. Stop cancels generation/playback/recording. This is turn-based voice, not a continuous realtime telephone call. Speech facial movement is stylised, not phoneme-accurate lip sync.

Camera depth is a separate local model and sends no camera images to OpenAI. Local input modes yield to new agent performances. Camera and sound-reactive controls retain their existing on/off lifecycle.

## Checks and deployment limits

Run `node --import tsx --test tests/robot-contracts.test.ts` and `node --test tests/contact-depth.test.mjs`, then the Next build. Live verification used a community question and a synthetic TTS → transcription round trip; no real microphone recording was captured by the assistant.

Not deployed publicly. Current abuse protection is a bounded, per-process rate limiter and same-origin check. A production rollout should connect the site's distributed rate limiting/access policy before exposing paid inference at scale. No private member data, persistent chat store or autonomous outbound actions are connected.
