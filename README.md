# Marginalia

A Bible reader where you speak your commentary beside the verse. Select a verse, a range, or a whole chapter, press **Record**, and your voice is saved to your account as a small waveform in the margin next to the text.

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Motion · Postgres · Cloudflare R2

## Set it up (about 15 minutes)

You need **Node 20.6 or newer** (`node -v`).

### 1. Install

```bash
npm install
```

### 2. Postgres

Create a free database at [Neon](https://neon.com) (or use Supabase, or any Postgres 13+). Copy its connection string. It looks like `postgres://user:password@host/dbname?sslmode=require`.

### 3. Cloudflare R2 bucket

1. In the Cloudflare dashboard open **R2 Object Storage** and create a bucket, e.g. `marginalia-audio`. Leave it **private**.
2. On the R2 overview page, copy your **Account ID**.
3. Go to **Manage API tokens → Create API token**. Choose **Object Read & Write**, limit it to your bucket, and create it. Copy the **Access Key ID** and **Secret Access Key** now; the secret is shown once.

### 4. Allow browser uploads (CORS)

Audio goes from the browser straight to R2, so the bucket must allow your site. Open the bucket → **Settings → CORS Policy → Add CORS policy** and paste:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

When you deploy, add your real site address (e.g. `https://marginalia.example.com`) to `AllowedOrigins`.

### 5. Configure and start

```bash
cp .env.example .env.local     # then fill in the values from steps 2 and 3
npm run db:migrate             # creates the tables
npm run doctor                 # checks Postgres and R2 are reachable
npm run dev                    # http://localhost:3000
```

Create your account from the **Sign in** button. Once you have, set `ALLOW_SIGNUPS=false` in `.env.local` (and restart) so nobody else can register.

## How saving works

```
Browser ── 1. POST /api/commentaries ─────────► Postgres: row created as 'pending'
        ◄─ signed upload URL (10 min) ─────────  (metadata only, no audio)
        ── 2. PUT audio ────────────────────────► R2 (directly, with progress)
        ── 3. POST /api/commentaries/{id}/complete ► server checks the file exists in R2, row → 'ready'
Playback: <audio src="/api/commentaries/{id}/audio"> ► checks you own it ► 302 to a 1-hour signed R2 URL
```

The bucket never needs to be public, the app server never handles audio bytes, and a half-finished upload is invisible and cleaned up automatically.

## API

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register`, `/login`, `/logout` · `GET /api/auth/me` | Accounts and sessions |
| `GET /api/commentaries[?book=&chapter=]` | Your commentaries (metadata + waveform peaks) |
| `POST /api/commentaries` | Step 1 of saving; returns `{ id, uploadUrl }` |
| `POST /api/commentaries/{id}/complete` | Step 3 of saving |
| `PATCH /api/commentaries/{id}` · `DELETE /api/commentaries/{id}` | Rename · delete (removes the R2 file too) |
| `GET /api/commentaries/{id}/audio[?download=1]` | Owner-checked redirect to the audio |
| `GET /api/translations` · `/api/scripture/…` · `/api/lexicon/…` | Bible text and lexicon from getBible and Bolls (public) |

## Security notes

- Passwords are hashed with scrypt (OWASP parameters); the login path does the same work whether or not the email exists.
- Sessions are random tokens in an `HttpOnly`, `SameSite=Lax` cookie. Only a SHA-256 of the token is stored, so a database leak can't be replayed as logins. They last 30 days and renew as you use them.
- State-changing routes also reject cross-site `Origin` headers.
- Every commentary query is scoped to the signed-in user, and the audio route re-checks ownership on every request.
- Uploads are limited to WebM, MP4 or Ogg audio, 60 MB, and the signed URL is locked to the declared content type.
- Login and sign-up attempts are rate limited **in memory**, so limits are per server instance. That's fine for one server; use Upstash Redis or similar if you scale out.
- Not included yet: email verification and password reset. Because sign-ups can be closed after you register, this matters mainly if you open the app to others.

## Where things are

```
db/schema.sql                        users, sessions, commentaries
scripts/migrate.mjs, doctor.mjs      npm run db:migrate, npm run doctor
src/lib/server/                      Postgres, R2 signing, sessions, validation (server only)
src/app/api/                         route handlers
src/lib/api.ts                       browser client: the 3-step upload, XHR progress
src/hooks/useAuth.tsx                session state + sign-in dialog control
src/hooks/useRecorder.ts             MediaRecorder + live level sampling
src/components/RecorderSheet.tsx     record → review → upload
```

## Notes

- **Recordings made before accounts existed** (saved only in one browser): sign in, open **Library**, and use the upload banner. It keeps their original dates and removes the local copy after each upload.
- **Backups.** Neon keeps point-in-time history on its plans; for R2, download anything critical, or copy the bucket on a schedule.
- **Cost.** R2 doesn't charge for egress, and audio is small (roughly 0.25 MB per minute of speech), so storage is cheap.
- **Licensing of Bible text.** Technical access to a translation isn't a licence to redistribute it. Check each translation's terms before deploying publicly.
- **Bolls asks not to be scraped.** Chapters are cached, but for a public launch, download the translations you need and serve them yourself.

## Ideas for next

- Email verification and password reset (Resend or Postmark).
- Transcribe each recording (Whisper) so commentary is searchable.
- Share one commentary as a public link.
- Scripture search (Bolls exposes `/v2/find/{translation}`).
- Cross-references and parallel translations in the margin.
