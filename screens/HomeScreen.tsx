import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Image,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  Text,
  useWindowDimensions,
  View
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { createCircle, getMyCircles } from '../services/circleService'
import { getFeedItems, type FeedItem } from '../services/feedService'
import { getOrCreateInviteForCircle, redeemInviteCode } from '../services/inviteService'
import { uploadPhotoFromUri } from '../services/photoService'
import { HomeModals } from './home/HomeModals'
import { styles } from './home/styles'
import type { CircleMemberRow } from './home/types'
import { getCircleName, getFeedCircleItems, getFeedCircleTitle } from './home/utils'
import { useFeedTransitions } from './home/useFeedTransitions'

export default function HomeScreen() {
  const { width, height } = useWindowDimensions()
  const frameSize = Math.min(width - 28, height * 0.52)

  const cameraRef = useRef<CameraView | null>(null)
  const [permission, requestPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'front' | 'back'>('front')

  const [circles, setCircles] = useState<CircleMemberRow[]>([])
  const [postToAll, setPostToAll] = useState(true)
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([])

  const [circleName, setCircleName] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [inviteCircleId, setInviteCircleId] = useState('')
  const [generatedInviteCode, setGeneratedInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [joinCode, setJoinCode] = useState('')

  const [capturedUri, setCapturedUri] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [feedLoading, setFeedLoading] = useState(false)
  const [selectedFeedCircleId, setSelectedFeedCircleId] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)

  const {
    baseLayerUri,
    feedIndex,
    feedMode,
    feedProgress,
    feedTransition,
    panHandlers,
    topCardY,
    topLayerUri,
    topLayerVisible
  } = useFeedTransitions({
    actionBusy,
    capturedUri,
    feed,
    frameSize,
    onCameraExitStart: () => setCameraReady(false)
  })

  const runWithCooldown = async (fn: () => Promise<void>, cooldownMs = 900) => {
    if (actionBusy) return
    setActionBusy(true)
    try {
      await fn()
    } finally {
      setTimeout(() => setActionBusy(false), cooldownMs)
    }
  }

  const prefetchFeedImages = async (items: FeedItem[]) => {
    await Promise.allSettled(items.map((item) => Image.prefetch(item.imageUrl)))
  }

  const loadCircles = async () => {
    try {
      const data = await getMyCircles()
      setCircles((data ?? []) as CircleMemberRow[])
    } catch (error: any) {
      Alert.alert('Failed to load circles', error?.message ?? 'Unknown error')
    }
  }

  const loadFeed = async (opts?: { silent?: boolean; prefetch?: boolean }) => {
    const silent = opts?.silent ?? false
    const shouldPrefetch = opts?.prefetch ?? true

    try {
      if (!silent) setFeedLoading(true)
      const items = await getFeedItems()
      setFeed(items)
      if (shouldPrefetch) void prefetchFeedImages(items)
    } catch (error: any) {
      if (!silent) Alert.alert('Failed to load feed', error?.message ?? 'Unknown error')
    } finally {
      if (!silent) setFeedLoading(false)
    }
  }

  useEffect(() => {
    void loadCircles()
    void loadFeed({ prefetch: true })
  }, [])

  useEffect(() => {
    if (!permission) return
    if (!permission.granted) {
      setCameraReady(false)
      void requestPermission()
    }
  }, [permission, requestPermission])

  useEffect(() => {
    if (feedMode || capturedUri) {
      setCameraReady(false)
    }
  }, [feedMode, capturedUri])

  useEffect(() => {
    const parseInviteFromUrl = (url: string | null) => {
      if (!url) return
      const parts = url.split('/')
      const maybeCode = parts[parts.length - 1]
      if (!maybeCode) return
      setJoinCode(maybeCode.toUpperCase())
      setShowJoinModal(true)
    }

    void Linking.getInitialURL().then(parseInviteFromUrl)
    const sub = Linking.addEventListener('url', ({ url }) => parseInviteFromUrl(url))
    return () => sub.remove()
  }, [])

  useEffect(() => {
    if (feedMode || capturedUri) return
    const interval = setInterval(() => {
      void loadFeed({ silent: true, prefetch: true })
    }, 30000)
    return () => clearInterval(interval)
  }, [feedMode, capturedUri])

  useEffect(() => {
    setSelectedFeedCircleId(null)
  }, [feedIndex, feedMode])

  const handleCreateCircle = async () => {
    await runWithCooldown(async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) return Alert.alert('Not signed in')
      if (!circleName.trim()) return Alert.alert('Enter a circle name')

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
      if (!cameraRef.current) return Alert.alert('Camera not ready')
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.55 })
      if (photo?.uri) setCapturedUri(photo.uri)
    })
  }

  const handleGalleryPick = async () => {
    await runWithCooldown(async () => {
      const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!mediaPermission.granted) return Alert.alert('Gallery permission required')

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
        return Alert.alert('Pick circles or choose ALL')
      }

      const success = await uploadPhotoFromUri(capturedUri, {
        postToAll,
        circleIds: selectedCircleIds
      })

      if (success) {
        setCapturedUri(null)
        await loadFeed({ prefetch: true })
      }
    }, 1200)
  }

  const loadInviteCode = async (circleId: string) => {
    if (!circleId) return
    try {
      setInviteLoading(true)
      const code = await getOrCreateInviteForCircle(circleId)
      setGeneratedInviteCode(code)
    } catch (error: any) {
      Alert.alert('Invite failed', error?.message ?? 'Unknown error')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleShareInvite = async () => {
    if (!generatedInviteCode) return
    const inviteLink = `kinbit://invite/${generatedInviteCode}`
    await Share.share({
      message: `Join my circle on Kinbit\nCode: ${generatedInviteCode}\nLink: ${inviteLink}`
    })
  }

  const handleJoinWithCode = async () => {
    await runWithCooldown(async () => {
      if (!joinCode.trim()) return Alert.alert('Enter invite code')

      try {
        await redeemInviteCode(joinCode.trim().toUpperCase())
        setJoinCode('')
        setShowJoinModal(false)
        await loadCircles()
        await loadFeed({ prefetch: true })
        Alert.alert('Joined circle')
      } catch (error: any) {
        Alert.alert('Join failed', error?.message ?? 'Unknown error')
      }
    })
  }

  const openInviteModal = () => {
    if (actionBusy) return
    const firstCircleId = circles[0]?.circle_id ?? ''
    if (!firstCircleId) return Alert.alert('Create a circle first')

    setInviteCircleId(firstCircleId)
    setGeneratedInviteCode('')
    setShowInviteModal(true)
    void loadInviteCode(firstCircleId)
  }

  const handleLogout = async () => {
    await runWithCooldown(async () => {
      const { error } = await supabase.auth.signOut()
      if (error) {
        Alert.alert('Logout failed', error.message)
      }
    })
  }

  const isSendState = Boolean(capturedUri)
  const safeFeedIndex = feed.length > 0 ? Math.min(feedIndex, feed.length - 1) : 0
  const activeFeedItem = feed[safeFeedIndex]
  const transitionFromItem = feedTransition ? feed[feedTransition.from] : null
  const transitionToItem = feedTransition ? feed[feedTransition.to] : null
  const activeFeedUri = activeFeedItem?.imageUrl ?? null
  const fallbackFeedUri = feed[0]?.imageUrl ?? null
  const hideBaseLayer =
    feedTransition?.kind === 'camera-enter' || feedTransition?.kind === 'camera-exit'
  const resolvedBaseLayerUri = hideBaseLayer ? null : baseLayerUri ?? activeFeedUri ?? fallbackFeedUri
  const resolvedTopLayerUri = topLayerUri ?? (topLayerVisible ? activeFeedUri ?? fallbackFeedUri : null)

  const displayedFeedItem =
    feedTransition?.kind === 'feed-up'
      ? transitionToItem ?? activeFeedItem
      : feedTransition?.kind === 'feed-down'
        ? transitionFromItem ?? activeFeedItem
        : activeFeedItem

  const frameScale = feedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1]
  })

  const chromeOpacity = feedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0]
  })

  const chromeShift = feedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18]
  })

  const feedInfoOpacity = feedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  })

  const feedCircleTitle = useMemo(
    () => getFeedCircleTitle(displayedFeedItem ?? undefined, circles),
    [circles, displayedFeedItem]
  )

  const feedCircleItems = useMemo(
    () => getFeedCircleItems(displayedFeedItem ?? undefined, circles),
    [circles, displayedFeedItem]
  )

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.screen} {...panHandlers}>
        <Animated.View
          style={[styles.headerWrap, { opacity: chromeOpacity, transform: [{ translateY: chromeShift }] }]}
        >
          <View style={styles.headerRow}>
            <View style={styles.pill}>
              <MaterialCommunityIcons name="account-group" size={18} color="#EAF2FF" />
              <Text style={styles.pillText}>{circles.length} Circles</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={[styles.iconButton, actionBusy && styles.disabled]}
                onPress={() => !actionBusy && setShowJoinModal(true)}
                disabled={actionBusy}
              >
                <Ionicons name="log-in-outline" size={20} color="#EAF2FF" />
              </Pressable>
              <Pressable
                style={[styles.iconButton, actionBusy && styles.disabled]}
                onPress={openInviteModal}
                disabled={actionBusy}
              >
                <Ionicons name="person-add-outline" size={20} color="#EAF2FF" />
              </Pressable>
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
              <Pressable
                style={[styles.iconButton, actionBusy && styles.disabled]}
                onPress={() => void handleLogout()}
                disabled={actionBusy}
              >
                <Ionicons name="log-out-outline" size={20} color="#EAF2FF" />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View pointerEvents={feedMode ? 'auto' : 'none'} style={[styles.feedTopMeta, { opacity: feedInfoOpacity }]}>
          <View style={styles.postedPill}>
            <Ionicons name="person-circle-outline" size={16} color="#EAF2FF" />
            <Text style={styles.postedPillText}>
              {displayedFeedItem ? `Posted by ${displayedFeedItem.senderUsername}` : 'Posted by'}
            </Text>
          </View>
          <Text style={styles.feedCircleTitle}>{feedCircleTitle}</Text>
        </Animated.View>

        <View style={styles.centerWrap}>
          <Animated.View style={{ transform: [{ scale: frameScale }] }}>
            <View style={[styles.frame, { width: frameSize, height: frameSize }]}>
              {feedMode ? (
                <>
                  {resolvedBaseLayerUri ? (
                    <Image
                      source={{ uri: resolvedBaseLayerUri }}
                      style={styles.mediaAbsoluteBack}
                      resizeMode="cover"
                      fadeDuration={0}
                    />
                  ) : null}
                  {topLayerVisible && resolvedTopLayerUri ? (
                    <Animated.View style={[styles.stackCard, { transform: [{ translateY: topCardY }] }]}>
                      <Image
                        source={{ uri: resolvedTopLayerUri }}
                        style={styles.stackCardImage}
                        resizeMode="cover"
                        fadeDuration={0}
                      />
                    </Animated.View>
                  ) : null}
                </>
              ) : isSendState ? (
                <Image source={{ uri: capturedUri! }} style={styles.media} resizeMode="cover" fadeDuration={0} />
              ) : permission?.granted ? (
                <>
                  <CameraView
                    ref={cameraRef}
                    style={styles.media}
                    facing={facing}
                    onCameraReady={() => setCameraReady(true)}
                  />
                  {!cameraReady ? <View style={styles.cameraWarmupMask} /> : null}
                </>
              ) : (
                <View style={styles.permissionBox}>
                  <Text style={styles.permissionText}>Camera permission required</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        <Animated.View
          pointerEvents={feedMode ? 'none' : 'auto'}
          style={[styles.bottomWrap, { opacity: chromeOpacity, transform: [{ translateY: chromeShift }] }]}
        >
          {isSendState ? (
            <View style={styles.sendPanel}>
              <Text style={styles.sendLabel}>Send to</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleRow}>
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
                      <Ionicons name="ellipse" size={20} color={selected ? '#06241A' : '#A9C2E6'} />
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
              <Ionicons name="arrow-up" size={16} color="#7FD8BE" />
              <Text style={styles.captureHint}>
                Swipe up on square for feed
                {feedLoading ? ' (loading...)' : feed.length > 0 ? ` (${feed.length})` : ''}
              </Text>
            </View>
          )}

          <View style={styles.bottomControls}>
            <Pressable
              style={[styles.sideAction, actionBusy && styles.disabled]}
              onPress={() => void handleGalleryPick()}
              disabled={actionBusy}
            >
              <Ionicons name="images-outline" size={24} color="#EAF2FF" />
            </Pressable>
            <Pressable
              style={[styles.shutterOuter, actionBusy && styles.disabled]}
              onPress={() => void (isSendState ? handlePost() : handleCapture())}
              disabled={actionBusy}
            >
              <View style={styles.shutterInner}>
                <Ionicons name={isSendState ? 'paper-plane' : 'camera-outline'} size={26} color="#09101D" />
              </View>
            </Pressable>
            <Pressable
              style={[styles.sideAction, actionBusy && styles.disabled]}
              onPress={() => {
                if (actionBusy) return
                if (isSendState) setCapturedUri(null)
                else setFacing((prev) => (prev === 'front' ? 'back' : 'front'))
              }}
              disabled={actionBusy}
            >
              <Ionicons name={isSendState ? 'close' : 'sync'} size={24} color="#EAF2FF" />
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View
          pointerEvents={feedMode ? 'auto' : 'none'}
          style={[styles.feedCirclesPanel, { opacity: feedInfoOpacity }]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.feedCircleRow}>
            {feedCircleItems.map((circle) => {
              const selected = selectedFeedCircleId === circle.id
              return (
                <Pressable
                  key={circle.id}
                  style={styles.feedCircleButton}
                  onPress={() => setSelectedFeedCircleId((prev) => (prev === circle.id ? null : circle.id))}
                >
                  {selected ? <Text style={styles.feedCircleTag}>{circle.name}</Text> : null}
                  <View style={[styles.feedCircleBack, { backgroundColor: circle.color }]} />
                  <View style={[styles.feedCircleFront, { backgroundColor: circle.color }]}>
                    <Text style={styles.feedCircleInitial}>{circle.initial}</Text>
                  </View>
                  <Text style={styles.feedCircleCaption} numberOfLines={1}>
                    {circle.name}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </Animated.View>
      </View>

      <HomeModals
        actionBusy={actionBusy}
        circleName={circleName}
        circles={circles}
        generatedInviteCode={generatedInviteCode}
        handleCreateCircle={() => void handleCreateCircle()}
        handleJoinWithCode={() => void handleJoinWithCode()}
        handleShareInvite={() => void handleShareInvite()}
        inviteCircleId={inviteCircleId}
        inviteLoading={inviteLoading}
        joinCode={joinCode}
        loadInviteCode={(circleId) => void loadInviteCode(circleId)}
        setCircleName={setCircleName}
        setGeneratedInviteCode={setGeneratedInviteCode}
        setInviteCircleId={setInviteCircleId}
        setJoinCode={setJoinCode}
        setShowCreateModal={setShowCreateModal}
        setShowInviteModal={setShowInviteModal}
        setShowJoinModal={setShowJoinModal}
        showCreateModal={showCreateModal}
        showInviteModal={showInviteModal}
        showJoinModal={showJoinModal}
      />
    </SafeAreaView>
  )
}
