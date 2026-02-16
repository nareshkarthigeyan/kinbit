# Supabase bootstrap SQL

Run these files in order in the Supabase SQL Editor:

1. `db/01_schema.sql`
2. `db/02_enable_rls.sql`
3. `db/03_users_policy.sql`
4. `db/04_phase2_policies.sql`

Then create storage bucket manually:

- Name: `photos`
- Private bucket: `true`
- File size limit: `2MB`
