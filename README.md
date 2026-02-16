# Kinbit

Kinbit is an open-source, mobile-first photo sharing app inspired by the Locket-style flow:
- camera-first UI
- private circle-based sharing
- Supabase auth + storage + Postgres backend
- invite code/link onboarding

This repository is licensed under **GNU GPL v3.0** (see `LICENSE`).

## Features

- Email/password auth with persistent sessions (Expo Secure Store)
- Auto user profile provisioning (`public.users`)
- Circle creation and membership
- Invite code/link join flow (`kinbit://invite/<CODE>`)
- Photo upload to private Supabase Storage bucket (`photos`)
- Photo metadata + circle mapping in Postgres
- Feed with circle-scoped photo retrieval and gesture navigation

## Tech Stack

- Expo (React Native + TypeScript)
- Supabase:
  - Auth
  - Postgres with RLS
  - Storage
- `@supabase/supabase-js`
- `expo-camera`, `expo-image-picker`

## Project Structure

```text
kinbit/
├── App.tsx
├── lib/
│   └── supabase.ts
├── screens/
│   ├── AuthScreen.tsx
│   ├── HomeScreen.tsx
│   ├── auth/
│   │   └── styles.ts
│   └── home/
│       ├── HomeModals.tsx
│       ├── styles.ts
│       ├── types.ts
│       ├── useFeedTransitions.ts
│       └── utils.ts
├── services/
│   ├── circleService.ts
│   ├── feedService.ts
│   ├── inviteService.ts
│   ├── photoService.ts
│   └── userService.ts
├── hooks/
│   └── useAuthSession.ts
└── db/
    ├── 01_schema.sql
    ├── 02_enable_rls.sql
    ├── 03_users_policy.sql
    ├── 04_phase2_policies.sql
    ├── 05_feed_read_policies.sql
    ├── 06_invites.sql
    ├── 07_fix_photo_map_policy_recursion.sql
    ├── 08_username_email_login.sql
    ├── 09_profile_sync_and_username_backfill.sql
    └── 10_users_read_profiles_policy.sql
```

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+
- Expo Go app (or iOS Simulator / Android Emulator)
- A Supabase account/project

## Quick Start

### 1) Clone and install

```bash
git clone <your-fork-or-repo-url>
cd kinbit
npm install
```

### 2) Configure environment

Create `.env.local` in project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_ANON_KEY
```

These are consumed in `lib/supabase.ts`.

### 3) Bootstrap Supabase database

In Supabase SQL Editor, run files in this exact order:

1. `db/01_schema.sql`
2. `db/02_enable_rls.sql`
3. `db/03_users_policy.sql`
4. `db/04_phase2_policies.sql`
5. `db/05_feed_read_policies.sql`
6. `db/06_invites.sql`
7. `db/07_fix_photo_map_policy_recursion.sql`
8. `db/08_username_email_login.sql`
9. `db/09_profile_sync_and_username_backfill.sql`
10. `db/10_users_read_profiles_policy.sql`

### 4) Create storage bucket

In Supabase Storage:
- Bucket name: `photos`
- Privacy: **Private**
- File size limit: `2MB`

### 5) Run app

```bash
npm run start
```

Then launch:
- `npm run ios` for iOS simulator
- `npm run android` for Android emulator
- or scan QR with Expo Go

## Development Notes

- Deep link scheme is configured in `app.json` as `kinbit`.
- Invite links follow: `kinbit://invite/<CODE>`.
- Feed uses signed storage URLs and includes in-memory URL caching for lower latency.
- Camera and feed transition behavior is implemented in `screens/home/useFeedTransitions.ts`.

## Typical Verification Flow

1. Sign up in app
2. Confirm row exists in `auth.users`
3. Confirm row exists in `public.users`
4. Create a circle
5. Generate/share invite and join from another account
6. Capture/upload photo
7. Confirm:
   - storage object in `photos` bucket
   - row in `public.photos`
   - rows in `public.photo_circle_map`
8. Swipe feed and verify circle visibility constraints

## Troubleshooting

- `RLS` errors:
  - Re-run SQL in `db/` in order
  - Verify policies were created successfully
- Camera permissions denied:
  - Re-enable camera/media permissions in OS settings
- Upload succeeds but feed is empty:
  - Check `photo_circle_map` rows for your user circles
  - Ensure photo is not expired (`expires_at`)
- Invite RPC/function not found:
  - Ensure `db/06_invites.sql` has been applied
- Username login not resolving:
  - Ensure `db/08_username_email_login.sql` has been applied
- Feed shows fallback names like `User-xxxxxx`:
  - Ensure `db/09_profile_sync_and_username_backfill.sql` and `db/10_users_read_profiles_policy.sql` have been applied

## Security and Data Model

- Private storage bucket for photos
- Row-level security enabled on core tables
- Auth-linked ownership checks in policies
- Session persistence via Expo Secure Store adapter

## Contributing

Contributions are welcome.

Recommended workflow:

1. Fork repo
2. Create feature branch
3. Make focused changes
4. Run type checks:

```bash
npx tsc --noEmit
```

5. Open PR with:
   - problem statement
   - change summary
   - screenshots/video for UI changes
   - migration notes if SQL changes are included

## License

This project is licensed under the **GNU General Public License v3.0**.

See:
- `LICENSE`
- <https://www.gnu.org/licenses/gpl-3.0.en.html>
