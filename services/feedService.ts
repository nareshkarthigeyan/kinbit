import { supabase } from '../lib/supabase'

type PhotoRow = {
  id: string
  sender_id: string
  storage_path: string
  created_at: string
  expires_at: string
}

type MapRow = {
  circle_id: string
  photo_id: string
  photos: PhotoRow | PhotoRow[] | null
}

export type FeedItem = {
  photoId: string
  imageUrl: string
  createdAt: string
  circleIds: string[]
  senderId: string
  senderUsername: string
}

export const getFeedItems = async () => {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) throw authError
  if (!authData.user) return []

  const { data: memberships, error: membershipsError } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', authData.user.id)

  if (membershipsError) throw membershipsError

  const memberCircleIds = (memberships ?? []).map((m) => m.circle_id)
  if (memberCircleIds.length === 0) return []

  const { data: mapped, error: mappedError } = await supabase
    .from('photo_circle_map')
    .select(
      `
      photo_id,
      circle_id,
      photos (
        id,
        sender_id,
        storage_path,
        created_at,
        expires_at
      )
    `
    )
    .in('circle_id', memberCircleIds)

  if (mappedError) throw mappedError

  const now = new Date()
  const grouped = new Map<string, { photo: PhotoRow; circleIds: Set<string> }>()

  for (const row of (mapped ?? []) as MapRow[]) {
    const photo = Array.isArray(row.photos) ? row.photos[0] : row.photos
    if (!photo) continue
    if (new Date(photo.expires_at) <= now) continue

    const existing = grouped.get(photo.id)
    if (existing) {
      existing.circleIds.add(row.circle_id)
      continue
    }

    grouped.set(photo.id, {
      photo,
      circleIds: new Set([row.circle_id])
    })
  }

  const entries = Array.from(grouped.values())
  const senderIds = Array.from(new Set(entries.map((e) => e.photo.sender_id)))
  const { data: userRows } = await supabase.from('users').select('id, username').in('id', senderIds)
  const usernameById = new Map<string, string>()
  for (const row of userRows ?? []) {
    usernameById.set(row.id as string, (row.username as string) ?? 'Unknown')
  }

  const signedResults = await Promise.all(
    entries.map(async (value) => {
      const { data: signed, error: signedError } = await supabase.storage
        .from('photos')
        .createSignedUrl(value.photo.storage_path, 24 * 60 * 60)

      if (signedError || !signed?.signedUrl) return null

      return {
        photoId: value.photo.id,
        imageUrl: signed.signedUrl,
        createdAt: value.photo.created_at,
        circleIds: Array.from(value.circleIds),
        senderId: value.photo.sender_id,
        senderUsername: usernameById.get(value.photo.sender_id) ?? 'Unknown'
      } as FeedItem
    })
  )

  const feedItems = signedResults.filter((item): item is FeedItem => item !== null)

  feedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return feedItems
}
