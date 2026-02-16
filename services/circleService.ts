import { supabase } from '../lib/supabase'
import { ensureUserProfile } from './userService'

export const createCircle = async (name: string, userId: string) => {
  const { data: userData } = await supabase.auth.getUser()
  await ensureUserProfile(userId, userData.user?.email)

  const { data, error } = await supabase
    .from('circles')
    .insert({
      name,
      created_by: userId
    })
    .select()
    .single()

  if (error) throw error

  const { error: memberError } = await supabase.from('circle_members').insert({
    circle_id: data.id,
    user_id: userId
  })
  if (memberError) throw memberError

  return data
}

export const getMyCircles = async () => {
  const { data, error } = await supabase
    .from('circle_members')
    .select(
      `
      circle_id,
      circles (
        id,
        name
      )
    `
    )
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)

  if (error) throw error

  return data
}
