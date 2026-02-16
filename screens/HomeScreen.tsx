import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { createCircle, getMyCircles } from '../services/circleService'
import { uploadPhotoFromUri } from '../services/photoService'

type CircleMemberRow = {
  circle_id: string
  circles:
    | {
        id: string
        name: string
      }
    | Array<{
        id: string
        name: string
      }>
}

export default function HomeScreen() {
  const { width } = useWindowDimensions()
  const frameSize = Math.min(width - 24, 520)

  const cameraRef = useRef<CameraView | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'front' | 'back'>('front')

  const [circles, setCircles] = useState<CircleMemberRow[]>([])
  const [postToAll, setPostToAll] = useState(true)
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([])

  const [circleName, setCircleName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const runWithCooldown = async (fn: () => Promise<void>, cooldownMs = 900) => {
    if (actionBusy) return
    setActionBusy(true)
    try {
      await fn()
    } finally {
      setTimeout(() => setActionBusy(false), cooldownMs)
    }
  }

  const getCircleName = (item: CircleMemberRow) =>
    Array.isArray(item.circles) ? item.circles[0]?.name ?? 'Circle' : item.circles.name

  const loadCircles = async () => {
    try {
      const data = await getMyCircles()
      setCircles((data ?? []) as CircleMemberRow[])
    } catch (error: any) {
      Alert.alert('Failed to load circles', error?.message ?? 'Unknown error')
    }
  }

  useEffect(() => {
    void loadCircles()
  }, [])

  useEffect(() => {
    if (!permission) return
    if (!permission.granted) {
      void requestPermission()
    }
  }, [permission, requestPermission])

  const handleCreateCircle = async () => {
    await runWithCooldown(async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        Alert.alert('Not signed in')
        return
      }
      if (!circleName.trim()) {
        Alert.alert('Enter a circle name')
        return
      }

      try {
        await createCircle(circleName.trim(), user.id)
        setCircleName('')
        setShowCreateModal(false)
        await loadCircles()
      } catch (error: any) {
        Alert.alert('Create circle failed', error?.message ?? 'Unknown error')
      }
    })
  }

  const toggleCircleSelection = (circleId: string) => {
    if (actionBusy) return
    setPostToAll(false)
    setSelectedCircleIds((prev) =>
      prev.includes(circleId) ? prev.filter((id) => id !== circleId) : [...prev, circleId]
    )
  }

  const toggleAllSelection = () => {
    if (actionBusy) return
    setPostToAll(true)
    setSelectedCircleIds([])
  }

  const handleCapture = async () => {
    await runWithCooldown(async () => {
      if (!cameraRef.current) {
        Alert.alert('Camera not ready')
        return
      }
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.55 })
      if (photo?.uri) {
        setCapturedUri(photo.uri)
      }
    })
  }

  const handleGalleryPick = async () => {
    await runWithCooldown(async () => {
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!mediaPermission.granted) {
        Alert.alert('Gallery permission required')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.55
      })

      if (result.canceled) return
      const uri = result.assets[0]?.uri
      if (uri) setCapturedUri(uri)
    })
  }

  const handlePost = async () => {
    if (!capturedUri) return

    await runWithCooldown(async () => {
      if (!postToAll && selectedCircleIds.length === 0) {
        Alert.alert('Pick circles or choose ALL')
        return
      }

      const success = await uploadPhotoFromUri(capturedUri, {
        postToAll,
        circleIds: selectedCircleIds
      })

      if (success) {
        setCapturedUri(null)
      }
    }, 1200)
  }

  const isSendState = Boolean(capturedUri)

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.pill}>
            <MaterialCommunityIcons name="account-group" size={18} color="#EAF2FF" />
            <Text style={styles.pillText}>{circles.length} Circles</Text>
          </View>
          <Pressable
            style={[styles.iconButton, actionBusy && styles.disabled]}
            onPress={() => {
              if (actionBusy) return
              setFacing((prev) => (prev === 'front' ? 'back' : 'front'))
            }}
            disabled={actionBusy}
          >
            <Ionicons name="camera-reverse-outline" size={22} color="#EAF2FF" />
          </Pressable>
        </View>

        <View style={[styles.frame, { width: frameSize, height: frameSize }]}> 
          {isSendState ? (
            <Image source={{ uri: capturedUri! }} style={styles.media} resizeMode="cover" />
          ) : permission?.granted ? (
            <CameraView ref={cameraRef} style={styles.media} facing={facing} />
          ) : (
            <View style={styles.permissionBox}>
              <Text style={styles.permissionText}>Camera permission required</Text>
            </View>
          )}
        </View>

        {isSendState ? (
          <View style={styles.sendPanel}>
            <Text style={styles.sendLabel}>Send to</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.circleRow}
            >
              <Pressable
                style={[styles.circleIcon, styles.addCircle, actionBusy && styles.disabled]}
                onPress={() => !actionBusy && setShowCreateModal(true)}
                disabled={actionBusy}
              >
                <Ionicons name="add" size={22} color="#D8E7FF" />
              </Pressable>

              <Pressable
                style={[styles.circleIcon, postToAll && styles.circleSelected, actionBusy && styles.disabled]}
                onPress={toggleAllSelection}
                disabled={actionBusy}
              >
                <MaterialCommunityIcons
                  name="account-group"
                  size={20}
                  color={postToAll ? '#06241A' : '#EAF2FF'}
                />
                <Text style={[styles.circleLabel, postToAll && styles.circleLabelSelected]}>All</Text>
              </Pressable>

              {circles.map((item) => {
                const selected = selectedCircleIds.includes(item.circle_id) && !postToAll
                return (
                  <Pressable
                    key={item.circle_id}
                    style={[styles.circleIcon, selected && styles.circleSelected, actionBusy && styles.disabled]}
                    onPress={() => toggleCircleSelection(item.circle_id)}
                    disabled={actionBusy}
                  >
                    <Ionicons
                      name="ellipse"
                      size={20}
                      color={selected ? '#06241A' : '#A9C2E6'}
                    />
                    <Text style={[styles.circleLabel, selected && styles.circleLabelSelected]} numberOfLines={1}>
                      {getCircleName(item)}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.captureHintRow}>
            <Ionicons name="sparkles" size={16} color="#7FD8BE" />
            <Text style={styles.captureHint}>Capture or pick from gallery</Text>
          </View>
        )}

        <View style={styles.bottomControls}>
          <Pressable
            style={[styles.sideAction, actionBusy && styles.disabled]}
            onPress={() => void handleGalleryPick()}
            disabled={actionBusy}
          >
            <Ionicons name="images-outline" size={26} color="#EAF2FF" />
          </Pressable>

          <Pressable
            style={[styles.shutterOuter, actionBusy && styles.disabled]}
            onPress={() => void (isSendState ? handlePost() : handleCapture())}
            disabled={actionBusy}
          >
            <View style={styles.shutterInner}>
              <Ionicons
                name={isSendState ? 'paper-plane' : 'camera-outline'}
                size={28}
                color="#09101D"
              />
            </View>
          </Pressable>

          <Pressable
            style={[styles.sideAction, actionBusy && styles.disabled]}
            onPress={() => {
              if (actionBusy) return
              if (isSendState) {
                setCapturedUri(null)
              } else {
                setFacing((prev) => (prev === 'front' ? 'back' : 'front'))
              }
            }}
            disabled={actionBusy}
          >
            <Ionicons name={isSendState ? 'close' : 'sync'} size={26} color="#EAF2FF" />
          </Pressable>
        </View>
      </View>

      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Circle</Text>
            <TextInput
              style={styles.input}
              placeholder="Circle name"
              placeholderTextColor="#8EA0BD"
              value={circleName}
              onChangeText={setCircleName}
              editable={!actionBusy}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButtonGhost, actionBusy && styles.disabled]}
                onPress={() => !actionBusy && setShowCreateModal(false)}
                disabled={actionBusy}
              >
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButtonPrimary, actionBusy && styles.disabled]}
                onPress={() => void handleCreateCircle()}
                disabled={actionBusy}
              >
                <Text style={styles.modalPrimaryText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#050A12',
    flex: 1
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    width: '100%'
  },
  pill: {
    alignItems: 'center',
    backgroundColor: '#1A2435',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  pillText: {
    color: '#EAF2FF',
    fontSize: 16,
    fontWeight: '700'
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#1A2435',
    borderRadius: 18,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  frame: {
    borderColor: '#5D6F8D',
    borderRadius: 36,
    borderStyle: 'dotted',
    borderWidth: 2,
    overflow: 'hidden'
  },
  media: {
    flex: 1
  },
  permissionBox: {
    alignItems: 'center',
    backgroundColor: '#121B2B',
    flex: 1,
    justifyContent: 'center'
  },
  permissionText: {
    color: '#EAF2FF',
    fontSize: 14
  },
  captureHintRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    minHeight: 26
  },
  captureHint: {
    color: '#A5B6D1',
    fontSize: 13,
    fontWeight: '600'
  },
  sendPanel: {
    marginTop: 12,
    minHeight: 94,
    width: '100%'
  },
  sendLabel: {
    color: '#EAF2FF',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    paddingHorizontal: 2
  },
  circleRow: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4
  },
  circleIcon: {
    alignItems: 'center',
    backgroundColor: '#1A2A42',
    borderColor: '#2E476E',
    borderRadius: 26,
    borderWidth: 1,
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  addCircle: {
    backgroundColor: '#142033'
  },
  circleSelected: {
    backgroundColor: '#28C79A',
    borderColor: '#28C79A'
  },
  circleLabel: {
    color: '#EAF2FF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    maxWidth: 90
  },
  circleLabelSelected: {
    color: '#06241A'
  },
  bottomControls: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%'
  },
  sideAction: {
    alignItems: 'center',
    backgroundColor: '#17263C',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  shutterOuter: {
    alignItems: 'center',
    backgroundColor: '#0E1C2E',
    borderColor: '#24C69A',
    borderRadius: 50,
    borderWidth: 4,
    height: 96,
    justifyContent: 'center',
    width: 96
  },
  shutterInner: {
    alignItems: 'center',
    backgroundColor: '#F1F6FF',
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#101827',
    borderColor: '#2A3A56',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    width: '100%'
  },
  modalTitle: {
    color: '#EAF2FF',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10
  },
  input: {
    backgroundColor: '#0A1321',
    borderColor: '#2B3D5A',
    borderRadius: 10,
    borderWidth: 1,
    color: '#EAF2FF',
    fontSize: 15,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end'
  },
  modalButtonGhost: {
    backgroundColor: '#1A2740',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  modalGhostText: {
    color: '#EAF2FF',
    fontWeight: '700'
  },
  modalButtonPrimary: {
    backgroundColor: '#28C79A',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  modalPrimaryText: {
    color: '#06241A',
    fontWeight: '800'
  },
  disabled: {
    opacity: 0.45
  }
})
