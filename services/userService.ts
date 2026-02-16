import { supabase } from '../lib/supabase'

export const ensureUserProfile = async (userId: string, username?: string | null) => {
  const { error } = await supabase.from('users').upsert(
    {
      id: userId,
      username: username ?? null
    },
    { onConflict: 'id' }
  )

  if (error) throw error
}

export const ensureCurrentUserProfile = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) return null

  await ensureUserProfile(data.user.id, data.user.email)
  return data.user
}
