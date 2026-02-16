import type { FeedItem } from '../../services/feedService'
import type { CircleMemberRow, FeedCircleItem } from './types'

export const getCircleName = (item: CircleMemberRow) =>
  Array.isArray(item.circles) ? item.circles[0]?.name ?? 'Circle' : item.circles.name

export const getColorForCircle = (id: string) => {
  const palette = ['#4F8EF7', '#45BFA3', '#E6A23C', '#8D6AF1', '#E67A7A', '#4AB2D6']
  let hash = 0
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i)) % palette.length
  return palette[hash]
}

export const getFeedCircleTitle = (
  item: FeedItem | undefined,
  circles: CircleMemberRow[]
) => {
  if (!item) return 'Feed'
  const names = item.circleIds
    .map((id) => circles.find((c) => c.circle_id === id))
    .map((c) => (c ? getCircleName(c) : null))
    .filter((name): name is string => Boolean(name))

  if (names.length === 0) return 'Circle Feed'
  if (names.length <= 2) return names.join(', ')
  return `${names[0]}, ${names[1]} +${names.length - 2}`
}

export const getFeedCircleItems = (
  item: FeedItem | undefined,
  circles: CircleMemberRow[]
): FeedCircleItem[] => {
  if (!item) return []
  return item.circleIds.map((id) => {
    const circle = circles.find((c) => c.circle_id === id)
    const name = circle ? getCircleName(circle) : 'Circle'
    return { id, name, initial: name[0]?.toUpperCase() ?? 'C', color: getColorForCircle(id) }
  })
}
