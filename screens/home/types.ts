export type CircleMemberRow = {
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

export type FeedTransitionKind = 'camera-enter' | 'camera-exit' | 'feed-up' | 'feed-down'

export type FeedTransition = {
  kind: FeedTransitionKind
  from: number
  to: number
} | null

export type FeedCircleItem = {
  id: string
  name: string
  initial: string
  color: string
}
