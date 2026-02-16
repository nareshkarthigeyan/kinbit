import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../lib/supabase'
import { createCircle, getMyCircles } from '../services/circleService'
import { getFeedItems, type FeedItem } from '../services/feedService'
import { getOrCreateInviteForCircle, redeemInviteCode } from '../services/inviteService'
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
  const [feedMode, setFeedMode] = useState(false)
  const [feedIndex, setFeedIndex] = useState(0)
  const [feedAnimating, setFeedAnimating] = useState(false)
  const [selectedFeedCircleId, setSelectedFeedCircleId] = useState<string | null>(null)
  const [baseLayerUri, setBaseLayerUriState] = useState<string | null>(null)
  const [topLayerUri, setTopLayerUriState] = useState<string | null>(null)
  const [topLayerVisible, setTopLayerVisibleState] = useState(false)
  const [feedTransition, setFeedTransition] = useState<{
    kind: 'camera-enter' | 'camera-exit' | 'feed-up' | 'feed-down'
    from: number
    to: number
  } | null>(null)

  const [actionBusy, setActionBusy] = useState(false)

  const feedProgress = useRef(new Animated.Value(0)).current
  const topCardY = useRef(new Animated.Value(0)).current
  const topCardYValueRef = useRef(0)
  const baseLayerUriRef = useRef<string | null>(null)
  const topLayerUriRef = useRef<string | null>(null)
  const topLayerVisibleRef = useRef(false)
  const transitionRef = useRef<{
    kind: 'camera-enter' | 'camera-exit' | 'feed-up' | 'feed-down'
    from: number
    to: number
  } | null>(null)
  const feedModeRef = useRef(feedMode)

  const setTopCardY = (value: number) => {
    topCardYValueRef.current = value
    topCardY.setValue(value)
  }

  const setBaseLayerUri = (uri: string | null) => {
    if (baseLayerUriRef.current === uri) return
    baseLayerUriRef.current = uri
    setBaseLayerUriState(uri)
  }

  const setTopLayerUri = (uri: string | null) => {
    if (topLayerUriRef.current === uri) return
    topLayerUriRef.current = uri
    setTopLayerUriState(uri)
  }

  const setTopLayerVisible = (visible: boolean) => {
    if (topLayerVisibleRef.current === visible) return
    topLayerVisibleRef.current = visible
    setTopLayerVisibleState(visible)
  }

  const setTransition = (
    next: {
      kind: 'camera-enter' | 'camera-exit' | 'feed-up' | 'feed-down'
      from: number
      to: number
    } | null
  ) => {
    transitionRef.current = next
    setFeedTransition(next)
  }

  const springTo = (value: Animated.Value, toValue: number) =>
    Animated.spring(value, {
      toValue,
      damping: 28,
      stiffness: 280,
      mass: 0.7,
      overshootClamping: true,
      useNativeDriver: true
    })

  const getFeedUri = (index: number) => feed[index]?.imageUrl ?? null

  const syncLayersToFeedIndex = (index: number) => {
    const uri = getFeedUri(index)
    setBaseLayerUri(uri)
  }

  const clearTopLayer = () => {
    setTopLayerVisible(false)
    setTopLayerUri(null)
  }

  useEffect(() => {
    feedModeRef.current = feedMode
  }, [feedMode])

  useEffect(() => {
    if (!feedMode || feedAnimating || transitionRef.current) return
    syncLayersToFeedIndex(feedIndex)
    clearTopLayer()
  }, [feed, feedIndex, feedMode, feedAnimating])

  useEffect(() => {
    if (feed.length === 0) return
    if (baseLayerUriRef.current) return
    syncLayersToFeedIndex(feedIndex)
  }, [feed, feedIndex])

  useEffect(() => {
    if (feed.length === 0) return
    if (feedIndex < feed.length) return
    setFeedIndex(feed.length - 1)
  }, [feed.length, feedIndex])

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
      if (feedIndex >= items.length) setFeedIndex(0)
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

  const startCameraEnterTransition = () => {
    const firstUri = getFeedUri(0)
    if (!firstUri) return false

    setFeedMode(true)
    setFeedIndex(0)
    setTransition({
      kind: 'camera-enter',
      from: -1,
      to: 0
    })
    setBaseLayerUri(null)
    setTopLayerUri(firstUri)
    setTopLayerVisible(true)
    setTopCardY(frameSize)
    feedProgress.setValue(0)
    return true
  }

  const startCameraExitTransition = () => {
    const currentUri = getFeedUri(feedIndex)
    if (!currentUri) return false

    setTransition({
      kind: 'camera-exit',
      from: feedIndex,
      to: -1
    })
    setBaseLayerUri(null)
    setTopLayerUri(currentUri)
    setTopLayerVisible(true)
    setTopCardY(0)
    feedProgress.setValue(1)
    return true
  }

  const startFeedStepTransition = (direction: 'up' | 'down', fromIndex: number, toIndex: number) => {
    const fromUri = getFeedUri(fromIndex)
    const toUri = getFeedUri(toIndex)
    if (!fromUri || !toUri) return false

    setTransition({
      kind: direction === 'up' ? 'feed-up' : 'feed-down',
      from: fromIndex,
      to: toIndex
    })

    if (direction === 'up') {
      setBaseLayerUri(fromUri)
      setTopLayerUri(toUri)
      setTopLayerVisible(true)
      setTopCardY(frameSize)
    } else {
      setBaseLayerUri(toUri)
      setTopLayerUri(fromUri)
      setTopLayerVisible(true)
      setTopCardY(0)
    }

    return true
  }

  const animateToFeed = (fromGesture = false) => {
    if (feed.length === 0) return Alert.alert('No feed yet', 'No circle photos available yet')
    if (feedAnimating) return

    const firstUri = getFeedUri(0)
    if (!firstUri) return Alert.alert('No feed yet', 'No circle photos available yet')

    setFeedAnimating(true)
    if (!fromGesture || transitionRef.current?.kind !== 'camera-enter') {
      if (!startCameraEnterTransition()) {
        setFeedAnimating(false)
        return
      }
    } else {
      setBaseLayerUri(null)
      setTopLayerUri(firstUri)
      setTopLayerVisible(true)
    }

    Animated.parallel([springTo(feedProgress, 1), springTo(topCardY, 0)]).start(() => {
      setFeedMode(true)
      setFeedIndex(0)
      syncLayersToFeedIndex(0)
      clearTopLayer()
      setTransition(null)
      setTopCardY(0)
      setFeedAnimating(false)
    })
  }

  const animateToCamera = (fromGesture = false) => {
    if (feedAnimating) return
    setFeedAnimating(true)
    setCameraReady(false)
    if (!fromGesture || transitionRef.current?.kind !== 'camera-exit') {
      if (!startCameraExitTransition()) {
        setFeedAnimating(false)
        return
      }
    } else {
      setTopLayerVisible(true)
    }
    Animated.parallel([springTo(feedProgress, 0), springTo(topCardY, frameSize)]).start(() => {
      clearTopLayer()
      setFeedMode(false)
      requestAnimationFrame(() => {
        setTransition(null)
        setTopCardY(0)
        setFeedAnimating(false)
      })
    })
  }

  const animateFeedStep = (direction: 'up' | 'down', targetIndex: number, fromGesture = false) => {
    if (feedAnimating) return

    const transition = transitionRef.current
    const fromIndex =
      fromGesture && transition && (transition.kind === 'feed-up' || transition.kind === 'feed-down')
        ? transition.from
        : feedIndex
    const toIndex =
      fromGesture && transition && (transition.kind === 'feed-up' || transition.kind === 'feed-down')
        ? transition.to
        : targetIndex
    if (toIndex < 0 || toIndex >= feed.length) return

    setFeedAnimating(true)
    if (
      !fromGesture ||
      !transition ||
      (direction === 'up' && transition.kind !== 'feed-up') ||
      (direction === 'down' && transition.kind !== 'feed-down')
    ) {
      if (!startFeedStepTransition(direction, fromIndex, toIndex)) {
        setFeedAnimating(false)
        return
      }
    }

    springTo(topCardY, direction === 'up' ? 0 : frameSize).start(() => {
      setFeedIndex(toIndex)
      syncLayersToFeedIndex(toIndex)
      clearTopLayer()
      if (direction === 'down') {
        setTopCardY(frameSize)
      } else {
        setTopCardY(0)
      }
      requestAnimationFrame(() => {
        if (direction === 'up') setTopCardY(0)
        setTransition(null)
        setFeedAnimating(false)
      })
    })
  }

  const cancelGestureTransition = () => {
    const transition = transitionRef.current
    if (!transition || feedAnimating) return

    setFeedAnimating(true)

    if (transition.kind === 'camera-enter') {
      Animated.parallel([springTo(feedProgress, 0), springTo(topCardY, frameSize)]).start(() => {
        setFeedMode(false)
        clearTopLayer()
        setTransition(null)
        setTopCardY(0)
        setFeedAnimating(false)
      })
      return
    }

    if (transition.kind === 'camera-exit') {
      Animated.parallel([springTo(feedProgress, 1), springTo(topCardY, 0)]).start(() => {
        syncLayersToFeedIndex(feedIndex)
        clearTopLayer()
        setTransition(null)
        setTopCardY(0)
        setFeedAnimating(false)
      })
      return
    }

    if (transition.kind === 'feed-up') {
      springTo(topCardY, frameSize).start(() => {
        syncLayersToFeedIndex(transition.from)
        clearTopLayer()
        setTopCardY(0)
        setTransition(null)
        setFeedAnimating(false)
      })
      return
    }

    springTo(topCardY, 0).start(() => {
      syncLayersToFeedIndex(transition.from)
      clearTopLayer()
      setTopCardY(0)
      setTransition(null)
      setFeedAnimating(false)
    })
  }

  const nextFeed = () => {
    if (feedIndex < feed.length - 1) {
      animateFeedStep('up', feedIndex + 1)
    }
  }

  const previousFeed = () => {
    if (feedIndex > 0) {
      animateFeedStep('down', feedIndex - 1)
      return
    }
    animateToCamera()
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_, g) => {
          if (actionBusy || capturedUri || feedAnimating) return

          if (transitionRef.current?.kind === 'camera-enter') {
            const y = Math.max(0, Math.min(frameSize, frameSize + g.dy))
            setTopCardY(y)
            feedProgress.setValue(1 - y / frameSize)
            return
          }

          if (transitionRef.current?.kind === 'camera-exit') {
            const y = Math.max(0, Math.min(frameSize, g.dy))
            setTopCardY(y)
            feedProgress.setValue(1 - y / frameSize)
            return
          }

          if (!feedModeRef.current) {
            if (g.dy < 0 && feed.length > 0) {
              if ((transitionRef.current as { kind?: string } | null)?.kind !== 'camera-enter' && !startCameraEnterTransition()) return
              const y = Math.max(0, Math.min(frameSize, frameSize + g.dy))
              setTopCardY(y)
              feedProgress.setValue(1 - y / frameSize)
            }
            return
          }

          if (g.dy < 0 && feedIndex < feed.length - 1) {
            if (
              (!transitionRef.current ||
                transitionRef.current.kind !== 'feed-up' ||
                transitionRef.current.to !== feedIndex + 1) &&
              !startFeedStepTransition('up', feedIndex, feedIndex + 1)
            )
              return
            const y = Math.max(0, Math.min(frameSize, frameSize + g.dy))
            setTopCardY(y)
            return
          }

          if (g.dy > 0) {
            if (feedIndex > 0) {
              if (
                (!transitionRef.current ||
                  transitionRef.current.kind !== 'feed-down' ||
                  transitionRef.current.to !== feedIndex - 1) &&
                !startFeedStepTransition('down', feedIndex, feedIndex - 1)
              )
                return
              const y = Math.max(0, Math.min(frameSize, g.dy))
              setTopCardY(y)
              return
            }

            if ((transitionRef.current as { kind?: string } | null)?.kind !== 'camera-exit' && !startCameraExitTransition()) return
            const y = Math.max(0, Math.min(frameSize, g.dy))
            setTopCardY(y)
            feedProgress.setValue(1 - y / frameSize)
          }
        },
        onPanResponderRelease: (_, g) => {
          if (actionBusy || capturedUri || feedAnimating) return

          const movedUp = frameSize - topCardYValueRef.current
          const movedDown = topCardYValueRef.current
          const commitUp = movedUp > frameSize * 0.08 || g.vy < -0.06
          const commitDown = movedDown > frameSize * 0.08 || g.vy > 0.06

          if (transitionRef.current?.kind === 'camera-enter') {
            if (commitUp) animateToFeed(true)
            else cancelGestureTransition()
            return
          }

          if (transitionRef.current?.kind === 'feed-up') {
            if (commitUp) return animateFeedStep('up', transitionRef.current.to, true)
            cancelGestureTransition()
            return
          }

          if (transitionRef.current?.kind === 'feed-down') {
            if (commitDown) return animateFeedStep('down', transitionRef.current.to, true)
            cancelGestureTransition()
            return
          }

          if (transitionRef.current?.kind === 'camera-exit') {
            if (commitDown) return animateToCamera(true)
            cancelGestureTransition()
            return
          }

          if (!feedModeRef.current) {
            if (g.dy < -18 || g.vy < -0.06) animateToFeed()
            return
          }
          if (g.dy < -18 || g.vy < -0.06) return nextFeed()
          if (g.dy > 18 || g.vy > 0.06) return previousFeed()
        }
      }),
    [actionBusy, capturedUri, feedAnimating, feed.length, feedIndex, frameSize]
  )

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

  const getFeedCircleTitle = (item?: FeedItem) => {
    if (!item) return 'Feed'
    const names = item.circleIds
      .map((id) => circles.find((c) => c.circle_id === id))
      .map((c) => (c ? getCircleName(c) : null))
      .filter((name): name is string => Boolean(name))

    if (names.length === 0) return 'Circle Feed'
    if (names.length <= 2) return names.join(', ')
    return `${names[0]}, ${names[1]} +${names.length - 2}`
  }

  const getColorForCircle = (id: string) => {
    const palette = ['#4F8EF7', '#45BFA3', '#E6A23C', '#8D6AF1', '#E67A7A', '#4AB2D6']
    let hash = 0
    for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % palette.length
    return palette[hash]
  }

  const getFeedCircleItems = (item?: FeedItem) => {
    if (!item) return []
    return item.circleIds.map((id) => {
      const circle = circles.find((c) => c.circle_id === id)
      const name = circle ? getCircleName(circle) : 'Circle'
      return { id, name, initial: name[0]?.toUpperCase() ?? 'C', color: getColorForCircle(id) }
    })
  }

  useEffect(() => {
    setSelectedFeedCircleId(null)
  }, [feedIndex, feedMode])

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.screen} {...panResponder.panHandlers}>
        <Animated.View style={[styles.headerWrap, { opacity: chromeOpacity, transform: [{ translateY: chromeShift }] }]}>
          <View style={styles.headerRow}>
            <View style={styles.pill}>
              <MaterialCommunityIcons name="account-group" size={18} color="#EAF2FF" />
              <Text style={styles.pillText}>{circles.length} Circles</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable style={[styles.iconButton, actionBusy && styles.disabled]} onPress={() => !actionBusy && setShowJoinModal(true)} disabled={actionBusy}>
                <Ionicons name="log-in-outline" size={20} color="#EAF2FF" />
              </Pressable>
              <Pressable style={[styles.iconButton, actionBusy && styles.disabled]} onPress={openInviteModal} disabled={actionBusy}>
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
          <Text style={styles.feedCircleTitle}>{getFeedCircleTitle(displayedFeedItem ?? undefined)}</Text>
        </Animated.View>

        <View style={styles.centerWrap}>
          <Animated.View style={{ transform: [{ scale: frameScale }] }}>
            <View style={[styles.frame, { width: frameSize, height: frameSize }]}> 
              {feedMode ? (
                <>
                  {resolvedBaseLayerUri ? (
                    <Image source={{ uri: resolvedBaseLayerUri }} style={styles.mediaAbsoluteBack} resizeMode="cover" fadeDuration={0} />
                  ) : null}
                  {topLayerVisible && resolvedTopLayerUri ? (
                    <Animated.View style={[styles.stackCard, { transform: [{ translateY: topCardY }] }]}>
                      <Image source={{ uri: resolvedTopLayerUri }} style={styles.stackCardImage} resizeMode="cover" fadeDuration={0} />
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
                <Pressable style={[styles.circleIcon, styles.addCircle, actionBusy && styles.disabled]} onPress={() => !actionBusy && setShowCreateModal(true)} disabled={actionBusy}>
                  <Ionicons name="add" size={22} color="#D8E7FF" />
                </Pressable>
                <Pressable style={[styles.circleIcon, postToAll && styles.circleSelected, actionBusy && styles.disabled]} onPress={toggleAllSelection} disabled={actionBusy}>
                  <MaterialCommunityIcons name="account-group" size={20} color={postToAll ? '#06241A' : '#EAF2FF'} />
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
                Swipe up on square for feed{feedLoading ? ' (loading...)' : feed.length > 0 ? ` (${feed.length})` : ''}
              </Text>
            </View>
          )}

          <View style={styles.bottomControls}>
            <Pressable style={[styles.sideAction, actionBusy && styles.disabled]} onPress={() => void handleGalleryPick()} disabled={actionBusy}>
              <Ionicons name="images-outline" size={24} color="#EAF2FF" />
            </Pressable>
            <Pressable style={[styles.shutterOuter, actionBusy && styles.disabled]} onPress={() => void (isSendState ? handlePost() : handleCapture())} disabled={actionBusy}>
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
            {getFeedCircleItems(displayedFeedItem ?? undefined).map((circle) => {
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

      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Circle</Text>
            <TextInput style={styles.input} placeholder="Circle name" placeholderTextColor="#8EA0BD" value={circleName} onChangeText={setCircleName} editable={!actionBusy} />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButtonGhost, actionBusy && styles.disabled]} onPress={() => !actionBusy && setShowCreateModal(false)} disabled={actionBusy}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButtonPrimary, actionBusy && styles.disabled]} onPress={() => void handleCreateCircle()} disabled={actionBusy}>
                <Text style={styles.modalPrimaryText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showInviteModal} transparent animationType="fade" onRequestClose={() => setShowInviteModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Invite</Text>
            <Text style={styles.modalHint}>Select circle</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circleRow}>
              {circles.map((item) => {
                const selected = inviteCircleId === item.circle_id
                return (
                  <Pressable
                    key={item.circle_id}
                    style={[styles.circleIcon, selected && styles.circleSelected, actionBusy && styles.disabled]}
                    onPress={() => {
                      if (actionBusy) return
                      setInviteCircleId(item.circle_id)
                      setGeneratedInviteCode('')
                      void loadInviteCode(item.circle_id)
                    }}
                    disabled={actionBusy}
                  >
                    <Text style={[styles.circleLabel, selected && styles.circleLabelSelected]}>{getCircleName(item)}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
            {generatedInviteCode ? (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>Invite Code</Text>
                <Text style={styles.codeValue}>{generatedInviteCode}</Text>
              </View>
            ) : (
              <View style={styles.codeBox}>
                <Text style={styles.codeLabel}>{inviteLoading ? 'Generating invite...' : 'Preparing invite...'}</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButtonGhost, actionBusy && styles.disabled]} onPress={() => !actionBusy && setShowInviteModal(false)} disabled={actionBusy}>
                <Text style={styles.modalGhostText}>Close</Text>
              </Pressable>
              <Pressable style={[styles.modalButtonPrimary, (actionBusy || !generatedInviteCode) && styles.disabled]} onPress={() => void handleShareInvite()} disabled={actionBusy || !generatedInviteCode}>
                <Text style={styles.modalPrimaryText}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Join Circle</Text>
            <TextInput style={styles.input} placeholder="Invite code" placeholderTextColor="#8EA0BD" autoCapitalize="characters" value={joinCode} onChangeText={setJoinCode} editable={!actionBusy} />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButtonGhost, actionBusy && styles.disabled]} onPress={() => !actionBusy && setShowJoinModal(false)} disabled={actionBusy}>
                <Text style={styles.modalGhostText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalButtonPrimary, actionBusy && styles.disabled]} onPress={() => void handleJoinWithCode()} disabled={actionBusy}>
                <Text style={styles.modalPrimaryText}>Join</Text>
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
  screen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  headerWrap: {
    marginBottom: 12,
    width: '100%'
  },
  feedTopMeta: {
    alignItems: 'center',
    marginBottom: 8,
    width: '100%'
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8
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
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  frame: {
    backgroundColor: '#000000',
    borderColor: '#5D6F8D',
    borderRadius: 36,
    borderStyle: 'dotted',
    borderWidth: 2,
    overflow: 'hidden'
  },
  media: {
    flex: 1
  },
  mediaAbsolute: {
    height: '100%',
    left: 0,
    position: 'absolute',
    top: 0,
    width: '100%'
  },
  mediaAbsoluteBack: {
    backgroundColor: '#000000',
    height: '100%',
    left: 0,
    opacity: 1,
    position: 'absolute',
    top: 0,
    width: '100%'
  },
  cameraWarmupMask: {
    backgroundColor: '#000',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  stackCard: {
    backgroundColor: '#000000',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10
    },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 14
  },
  stackCardImage: {
    height: '100%',
    width: '100%'
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
  bottomWrap: {
    marginTop: 12,
    width: '100%'
  },
  captureHintRow: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(10,22,38,0.78)',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  captureHint: {
    color: '#A5B6D1',
    fontSize: 13,
    fontWeight: '600'
  },
  sendPanel: {
    marginBottom: 10
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
  feedInfo: {
    alignItems: 'center',
    left: 14,
    position: 'absolute',
    right: 14,
    top: 14
  },
  postedPill: {
    alignItems: 'center',
    backgroundColor: '#1A2435',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  postedPillText: {
    color: '#EAF2FF',
    fontSize: 13,
    fontWeight: '700'
  },
  feedCircleTitle: {
    color: '#D9E6FA',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8
  },
  feedCirclesPanel: {
    alignItems: 'center',
    marginTop: 10,
    width: '100%'
  },
  feedCircleRow: {
    alignItems: 'flex-end',
    gap: 14,
    paddingVertical: 6
  },
  feedCircleButton: {
    alignItems: 'center',
    minWidth: 72,
    paddingTop: 24
  },
  feedCircleTag: {
    backgroundColor: '#EFF5FF',
    borderRadius: 12,
    color: '#0D203A',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  feedCircleBack: {
    borderRadius: 18,
    height: 34,
    left: 16,
    opacity: 0.4,
    position: 'absolute',
    top: 30,
    width: 34
  },
  feedCircleFront: {
    alignItems: 'center',
    borderColor: '#EAF2FF',
    borderRadius: 20,
    borderWidth: 2,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  feedCircleInitial: {
    color: '#0D1B2F',
    fontSize: 14,
    fontWeight: '800'
  },
  feedCircleCaption: {
    color: '#D4E2F8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 7,
    maxWidth: 84
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
  modalHint: {
    color: '#A9BAD4',
    marginBottom: 8
  },
  codeBox: {
    backgroundColor: '#0A1321',
    borderColor: '#2B3D5A',
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  codeLabel: {
    color: '#A9BAD4',
    fontSize: 12
  },
  codeValue: {
    color: '#EAF2FF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.2
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
