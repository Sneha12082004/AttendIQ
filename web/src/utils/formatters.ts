import { format, formatDistanceToNow, parseISO, differenceInMinutes } from 'date-fns'

export function formatDate(dateString: string, fmt = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateString), fmt)
  } catch {
    return dateString
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return format(parseISO(dateString), 'MMM d, yyyy h:mm a')
  } catch {
    return dateString
  }
}

export function formatTime(dateString: string): string {
  try {
    return format(parseISO(dateString), 'h:mm a')
  } catch {
    return dateString
  }
}

export function formatRelative(dateString: string): string {
  try {
    return formatDistanceToNow(parseISO(dateString), { addSuffix: true })
  } catch {
    return dateString
  }
}

export function formatDuration(startTime: string, endTime?: string): string {
  try {
    const start = parseISO(startTime)
    const end = endTime ? parseISO(endTime) : new Date()
    const mins = differenceInMinutes(end, start)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    const remaining = mins % 60
    return remaining > 0 ? `${hrs}h ${remaining}m` : `${hrs}h`
  } catch {
    return '—'
  }
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function trustScoreToGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  if (score >= 45) return 'D'
  return 'F'
}

export function gradeToColor(grade: string): string {
  const map: Record<string, string> = {
    A: '#10b981',
    B: '#0d9488',
    C: '#f59e0b',
    D: '#f97316',
    F: '#ef4444',
  }
  return map[grade] || '#94a3b8'
}

export function formatSessionDuration(startTime: string, endTime?: string): string {
  return formatDuration(startTime, endTime)
}

export function getAttendanceColor(percentage: number): string {
  if (percentage >= 75) return 'text-emerald-600'
  if (percentage >= 60) return 'text-amber-600'
  return 'text-red-600'
}

export function getAttendanceBgColor(percentage: number): string {
  if (percentage >= 75) return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  if (percentage >= 60) return 'bg-amber-50 border-amber-200 text-amber-700'
  return 'bg-red-50 border-red-200 text-red-700'
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
