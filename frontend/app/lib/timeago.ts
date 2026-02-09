import TimeAgo from 'react-timeago'

export const formatter = (value: number, unit: string, suffix: string) => {
  if (suffix === 'ago') {
    if (unit.startsWith('second')) return 'Less than a minute ago'
    return `${value} ${unit}${value > 1 ? 's' : ''} ago`
  } else {
    return `In ${value} ${unit}${value > 1 ? 's' : ''}`
  }
}