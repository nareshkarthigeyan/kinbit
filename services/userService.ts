import { supabase } from '../lib/supabase'

export const getSafeUsername = (username?: string | null) => {
  const trimmed = username?.trim()
  if (trimmed) return trimmed
  return undefined
}

export const ensureUserProfile = async (
  userId: string,
  username?: string | null,
  email?: string | null
) => {
  const payload: { id: string; username?: string | null; email?: string | null } = { id: userId }
  const normalizedUsername = getSafeUsername(username)
  if (normalizedUsername !== undefined) {
    payload.username = normalizedUsername
  }
  if (email !== undefined) {
    payload.email = email?.toLowerCase() ?? null
  }

  const { error } = await supabase.from('users').upsert(payload, { onConflict: 'id' })

  if (error) throw error
}

export const ensureCurrentUserProfile = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) return null

  const username = getSafeUsername((data.user.user_metadata?.username as string | undefined) ?? undefined)
  await ensureUserProfile(data.user.id, username, data.user.email)
  return data.user
}
