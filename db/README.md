# Supabase bootstrap SQL

Run these files in order in the Supabase SQL Editor:

1. `db/01_schema.sql`
2. `db/02_enable_rls.sql`
3. `db/03_users_policy.sql`
4. `db/04_phase2_policies.sql`
5. `db/05_feed_read_policies.sql`
6. `db/06_invites.sql`
7. `db/07_fix_photo_map_policy_recursion.sql`

Then create storage bucket manually:

- Name: `photos`
- Private bucket: `true`
- File size limit: `2MB`
