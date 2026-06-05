import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, fmt)
  } catch {
    return String(date)
  }
}

export function formatTime(datetime: string | null): string {
  if (!datetime) return '—'
  try {
    return format(parseISO(datetime), 'hh:mm a')
  } catch {
    return '—'
  }
}

export function formatDateTime(datetime: string | null): string {
  if (!datetime) return '—'
  try {
    return format(parseISO(datetime), 'dd MMM yyyy, hh:mm a')
  } catch {
    return '—'
  }
}

export function getAttendanceStatusColor(status: string): string {
  switch (status) {
    case 'Present': return 'badge-present'
    case 'Absent': return 'badge-absent'
    case 'Late': return 'badge-late'
    case 'Half Day': return 'badge-pending'
    default: return 'bg-muted text-muted-foreground border border-border'
  }
}

export function getLeaveStatusColor(status: string): string {
  switch (status) {
    case 'Approved': return 'badge-approved'
    case 'Rejected': return 'badge-rejected'
    case 'Pending': return 'badge-pending'
    default: return 'bg-muted text-muted-foreground border border-border'
  }
}

export function formatMinutes(minutes: number | null): string {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
