import { supabase } from '../lib/supabase'

export const ensureUserProfile = async (userId: string, username?: string | null) => {
  const payload: { id: string; username?: string | null } = { id: userId }
  if (username !== undefined) {
    payload.username = username
  }

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })

  if (error) throw error
}

export const ensureCurrentUserProfile = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) return null

  const username = (data.user.user_metadata?.username as string | undefined) ?? undefined
  await ensureUserProfile(data.user.id, username)
  return data.user
}
