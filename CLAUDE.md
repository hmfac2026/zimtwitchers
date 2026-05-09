@AGENTS.md

# Zim Twitchers

Private birdwatching app for a friend group. Browse a Wikipedia-style catalog of birds,
mark sightings, compete on weekly + all-time leaderboards.

## Stack

- **Next.js 16** App Router, React 19, TypeScript, Turbopack
- **Tailwind v4** (CSS-first config in `src/app/globals.css`)
- **shadcn/ui** components in `src/components/ui/` (base color: neutral)
- **Supabase** — auth, Postgres, storage, realtime (`@supabase/ssr`)
- **eBird API** for bird taxonomy + frequency data
- **Vercel** deployment (project linked via `.vercel/project.json`)

## Project structure

```
src/
  app/                Routes (App Router)
    page.tsx          Landing / coming-soon (Phase 1)
    layout.tsx        Root layout, fonts, metadata
    globals.css       Tailwind v4 + shadcn theme tokens
  components/
    ui/               shadcn primitives — do not edit; reinstall via shadcn CLI
  lib/
    supabase/
      client.ts       Browser Supabase client
      server.ts       Server Supabase client (uses cookies())
      admin.ts        Service-role client (server-only)
    utils.ts          shadcn `cn()` helper
```

## Commands

```bash
npm run dev          # local dev server (Turbopack)
npm run build        # production build
npm run start        # serve production build
npm run lint         # ESLint
npx tsc --noEmit     # type-check only

vercel               # deploy preview
vercel --prod        # deploy to production
vercel env ls        # list env vars
```

## Conventions

- **Mobile-first.** Most users will be on phones. Design from 375px up.
- **Server Components by default.** Use Client Components only when needed (state, effects, browser APIs).
- **Server Actions** for mutations from forms.
- **Row Level Security (RLS)** on every Supabase table — users only see their group's data.
- **Naming:** App is "Zim Twitchers"; package + repo + project are `zimtwitchers`.
- **Aesthetic:** Clean consumer-app feel. Generous whitespace, big bird photos. Not dashboard-y.
- **No comments unless the why is non-obvious.** Identifiers should explain themselves.

## Env vars (set in `.env.local` and on Vercel)

| Var | Where used |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | admin client (ingest scripts, server only) |
| `EBIRD_API_KEY` | bird taxonomy ingest (Phase 3) |

`.env.local` is gitignored. `.env.example` documents the required keys.

Vercel env vars are set for **Production** and **Development** targets. Preview is not yet
configured — the Vercel CLI's non-interactive mode requires an explicit Git branch when
adding to Preview, so we'll wire it up if/when we start using PR-based preview deploys.

## Deployment notes

- Vercel project `zimtwitchers` (id `prj_DAI5YomLYzKL7LGGByLbajl2mNMJ`) was created with
  framework preset "Other" before there was code. We PATCHed it via the Vercel API
  (`framework: nextjs`, build/output/install/dev commands set to `null` for auto-detect).
  If a future deploy 404s on the root URL, double-check `vercel project inspect` shows
  `Framework Preset: Next.js`.
- Production alias: `https://zimtwitchers.vercel.app`.
- GitHub auto-deploys from `main` are enabled (the project is linked to
  `github.com/hmfac2026/zimtwitchers`).

## Build phases

1. **Phase 1** ✅ — Bootstrap (Next.js, shadcn, Supabase clients, landing page, Vercel)
2. **Phase 2** — Auth + groups (Supabase Auth, RLS, `groups` + `group_members` schema, create/join flow)
3. **Phase 3** — Bird catalog (`birds` + `sightings` schema, `scripts/ingest-birds.ts`, browse + detail screens)
4. **Phase 4** — Sightings + life list (mark-as-seen, profile, friend life lists)
5. **Phase 5** — Leaderboards + feed (4-tab leaderboard, social feed, reactions, realtime)
6. **Phase 6** — PWA polish (manifest, icons, service worker, offline catalog)

After each phase: commit, push, deploy, summarize, **wait** for the user to test before continuing.

## Out of scope (v1)

No public leaderboards, no comments on feed items, no push notifications, no photo
recognition / auto-ID. Don't add these unless asked.
