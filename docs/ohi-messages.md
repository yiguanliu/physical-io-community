# OHI message playlist

## Editing

Sign in as an approved admin, then open the pencil control beside OHI on `/`, or choose **OHI messages** in `/admin`. Add, edit, remove, enable/disable and reorder messages. Set each duration (5–120 seconds) and scrolling speed (1–30 LED columns/second). Messages support up to three lines of English letters, digits and standard punctuation, 240 characters total. The renderer uses original 5×7 glyphs, including lowercase, not Arial or a downloaded font.

Changes are local drafts until **Publish playlist** is pressed. Closing a homepage editor asks before discarding; leaving the page with unsaved changes warns. Save failures retain the draft. Stale saves are rejected; **Reload saved playlist** explicitly discards the local draft and loads the current version. Publishing an empty playlist removes all programmed messages; disabled messages remain editable but are omitted from the public API.

Choose **Display lines** (1, 2 or 3) per message. New messages default to one line. Matching manual line breaks are preserved; otherwise whole words are distributed across the selected number of lines. Switching to fewer lines increases duration if needed (up to the 120-second limit); the timing validation and preview use the same layout as the robot. Short messages may use fewer rows when there are not enough words.

The initial announcement is `#2 Physical I/O: Robotics`, `Wednesday 7 October`, `18:00 - 21:00`, now displayed as one scrolling line for 40 seconds at 10 LED columns/second. It does not automatically expire: remove or disable it after the event. Older messages without a line-count setting retain a three-line layout.

## Playback

The first homepage announcement starts three seconds after the robot component mounts, or as soon as the scene and playlist are ready if loading takes longer. Subsequent messages and resumed playback use a five-second face interval. Each long line holds for one second, scrolls to the end, holds for another second and repeats. Validation requires enough duration to show the longest line fully at least once. The page fetches enabled content at mount, when becoming visible and once per minute. Chat, voice, manual robot controls and the editor take priority. Pause stops programmed playback and returns OHI to its expression. Reduced-motion mode disables automatic playback; **Read announcements** shows the full text without movement. Hidden tabs suspend playback.

## Persistence and access

Migration `supabase/migrations/20260914143303_ohi_display_playlist.sql` adds one singleton table with a versioned JSON playlist. It was applied to the connected hosted database with user approval and recorded as applied. No member, campaign or existing event rows were modified.

Both editor reads and writes validate the Supabase user with `getUser` and require `app_metadata.admin_role = admin`, matching the current workspace API. Client-visible editor access is only a hint; PUT enforces authorization independently, same-origin requests, input size/type, schema validation and compare-and-swap versioning. The database update and audit record commit in one transaction. Browser database roles have no table grants and RLS is enabled with default denial. Only enabled display content is projected through the public GET route. No HTML is interpreted.

## Verification

Unit tests: validation, glyphs, timing, anonymous/pending-role denial, spoofed metadata, origin checks, public projection, transactional failure handling and stale saves. Opt-in connected-database tests perform add/edit/delete/audit and role-denial checks inside a rolled-back transaction:

`OHI_DB_TEST=1 node --env-file=.env --env-file=.env.local node_modules/vitest/vitest.mjs run lib/robot/playlist-store.test.ts`

Supabase advisor: the table has the expected informational “RLS enabled, no policy” result (intentional server-only denial). An existing project-level warning says leaked-password protection is disabled; this feature did not change Auth settings. See [Supabase password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Browser checks use real public data; isolated editor UI checks mock admin API responses rather than signing in as or impersonating a real administrator. Database mutations are tested separately as above. Real administrator sign-in and publish-through-browser remains a user acceptance check; no authentication bypass was added.
