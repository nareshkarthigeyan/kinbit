import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, PanResponder } from 'react-native'
import type { FeedItem } from '../../services/feedService'
import type { FeedTransition } from './types'

type UseFeedTransitionsArgs = {
  actionBusy: boolean
  capturedUri: string | null
  feed: FeedItem[]
  frameSize: number
  onCameraExitStart?: () => void
}

export const useFeedTransitions = ({
  actionBusy,
  capturedUri,
  feed,
  frameSize,
  onCameraExitStart
}: UseFeedTransitionsArgs) => {
  const [feedMode, setFeedMode] = useState(false)
  const [feedIndex, setFeedIndex] = useState(0)
  const [feedAnimating, setFeedAnimating] = useState(false)
  const [baseLayerUri, setBaseLayerUriState] = useState<string | null>(null)
  const [topLayerUri, setTopLayerUriState] = useState<string | null>(null)
  const [topLayerVisible, setTopLayerVisibleState] = useState(false)
  const [feedTransition, setFeedTransition] = useState<FeedTransition>(null)

  const feedProgress = useRef(new Animated.Value(0)).current
  const topCardY = useRef(new Animated.Value(0)).current
  const topCardYValueRef = useRef(0)
  const baseLayerUriRef = useRef<string | null>(null)
  const topLayerUriRef = useRef<string | null>(null)
  const topLayerVisibleRef = useRef(false)
  const transitionRef = useRef<FeedTransition>(null)
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

  const setTransition = (next: FeedTransition) => {
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
    if (feed.length === 0 || feedAnimating) return

    const firstUri = getFeedUri(0)
    if (!firstUri) return

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
    onCameraExitStart?.()
    setFeedAnimating(true)

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
      setTopCardY(direction === 'down' ? frameSize : 0)
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
              if (
                (transitionRef.current as { kind?: string } | null)?.kind !== 'camera-enter' &&
                !startCameraEnterTransition()
              )
                return
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

            if (
              (transitionRef.current as { kind?: string } | null)?.kind !== 'camera-exit' &&
              !startCameraExitTransition()
            )
              return
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

  return {
    baseLayerUri,
    feedAnimating,
    feedIndex,
    feedMode,
    feedProgress,
    feedTransition,
    panHandlers: panResponder.panHandlers,
    setFeedIndex,
    topCardY,
    topLayerUri,
    topLayerVisible
  }
}
