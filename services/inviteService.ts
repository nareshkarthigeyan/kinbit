import { supabase } from '../lib/supabase'

export const createInviteForCircle = async (circleId: string) => {
  const { data, error } = await supabase.rpc('get_or_create_circle_invite', {
    p_circle_id: circleId,
    p_expires_hours: 72,
    p_max_users: 50
  })

  if (error) throw error
  return data as string
}

export const getOrCreateInviteForCircle = async (circleId: string) => {
  const { data, error } = await supabase.rpc('get_or_create_circle_invite', {
    p_circle_id: circleId,
    p_expires_hours: 72,
    p_max_users: 50
  })

  if (error) throw error
  return data as string
}

export const redeemInviteCode = async (code: string) => {
  const { data, error } = await supabase.rpc('redeem_circle_invite', {
    p_code: code
  })

  if (error) throw error
  return data as string
}
