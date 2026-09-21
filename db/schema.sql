-- Marginalia schema. Safe to run repeatedly (npm run db:migrate).

create table if not exists users (
  id            uuid primary key,
  email         text not null unique,          -- stored lower-case
  password_hash text not null,
  display_name  text,
  created_at    timestamptz not null default now()
);

-- Server-side sessions. The cookie holds a random token; only its SHA-256 is stored here,
-- so a leaked database can't be used to impersonate anyone.
create table if not exists sessions (
  id_hash    text primary key,
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx    on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- One row per spoken commentary. The audio itself lives in R2 under audio_key.
-- status 'pending' = row created and upload URL issued; 'ready' = the file is confirmed in R2.
create table if not exists commentaries (
  id          uuid primary key,
  user_id     uuid not null references users(id) on delete cascade,
  book        smallint not null check (book between 1 and 66),
  chapter     smallint not null check (chapter >= 1),
  verse_start smallint check (verse_start >= 1),
  verse_end   smallint check (verse_end >= 1),
  translation text not null,
  quote       text not null default '',
  title       text not null,
  duration_ms integer not null check (duration_ms >= 0),
  mime_type   text not null,
  size_bytes  bigint,
  peaks       jsonb not null,
  audio_key   text not null unique,
  status      text not null default 'pending' check (status in ('pending', 'ready')),
  created_at  timestamptz not null default now(),
  check (
    (verse_start is null and verse_end is null)
    or (verse_start is not null and (verse_end is null or verse_end >= verse_start))
  )
);
create index if not exists commentaries_chapter_idx on commentaries (user_id, book, chapter) where status = 'ready';
create index if not exists commentaries_recent_idx  on commentaries (user_id, created_at desc);
create index if not exists commentaries_pending_idx on commentaries (created_at) where status = 'pending';
