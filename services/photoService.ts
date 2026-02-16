import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { Alert } from 'react-native'
import { ensureUserProfile, getSafeUsername } from './userService'

type UploadOptions = {
  postToAll?: boolean
  circleIds?: string[]
  caption?: string
}

export const uploadPhotoFromUri = async (uri: string, options: UploadOptions = {}) => {
  const user = (await supabase.auth.getUser()).data.user
  if (!user) {
    Alert.alert('Not signed in')
    return false
  }

  await ensureUserProfile(
    user.id,
    getSafeUsername((user.user_metadata?.username as string | undefined) ?? undefined),
    user.email
  )

  const response = await fetch(uri)
  const arrayBuffer = await response.arrayBuffer()

  const fileName = `${Date.now()}.jpg`
  const normalizedCaption = options.caption?.trim() || null

  const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, arrayBuffer, {
    contentType: 'image/jpeg'
  })

  if (uploadError) {
    console.log('storage upload error', uploadError)
    Alert.alert('Upload failed', uploadError.message)
    return false
  }

  const { data: photoData, error: photoError } = await supabase
    .from('photos')
    .insert({
      sender_id: user.id,
      storage_path: fileName,
      caption: normalizedCaption,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    })
    .select()
    .single()

  if (photoError) {
    console.log('photos insert error', photoError)
    Alert.alert('Photo metadata failed', photoError.message)
    return false
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', user.id)

  if (membershipsError) {
    console.log('memberships read error', membershipsError)
    Alert.alert('Could not find circles', membershipsError.message)
    return false
  }

  const allCircleIds = (memberships ?? []).map((m) => m.circle_id)
  const targetCircleIds =
    options.postToAll || !options.circleIds || options.circleIds.length === 0
      ? allCircleIds
      : allCircleIds.filter((circleId) => options.circleIds?.includes(circleId))

  if (targetCircleIds.length === 0) {
    Alert.alert('No target circles selected')
    return false
  }

  const { error: mapError } = await supabase.from('photo_circle_map').insert(
    targetCircleIds.map((circleId) => ({
      photo_id: photoData.id,
      circle_id: circleId
    }))
  )
  if (mapError) {
    console.log('photo map insert error', mapError)
    Alert.alert('Circle attach failed', mapError.message)
    return false
  }

  console.log('Photo attached to circles')
  return true
}

export const pickAndUploadPhoto = async () => {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) return

  const result = await ImagePicker.launchCameraAsync({
    quality: 0.5
  })

  if (result.canceled) return

  const uri = result.assets[0]?.uri
  if (!uri) return

  await uploadPhotoFromUri(uri, { postToAll: true })
}
