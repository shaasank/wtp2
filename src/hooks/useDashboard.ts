import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, adminSupabase } from '@/lib/supabase'
import type { DashboardStats, Profile } from '@/types'
import { format } from 'date-fns'
import { formatLocalDate, formatLocalTime, minutesAfterTime } from '@/lib/date'
import { toast } from '@/hooks/useToast'

export type TodayAttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Not Marked'

async function getActiveEmployeeIds(client: any) {
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .neq('role', 'admin')

  if (error) throw error

  const profiles = ((data ?? []) as (Profile & { is_active?: boolean })[]).filter((profile) => {
    if (profile.status) return profile.status === 'active'
    return profile.is_active !== false
  })

  return {
    profiles,
    ids: profiles.map((profile) => profile.id),
    count: profiles.length,
  }
}

async function getAttendanceCutoff(client: any) {
  const { data, error } = await client
    .from('attendance_settings')
    .select('check_in_cutoff')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.warn('Unable to load attendance cutoff, using default:', error)
  }

  return data?.check_in_cutoff ?? '09:30:00'
}

function getEffectiveLateMinutes(checkInTime: string | null, cutoff: string) {
  if (!checkInTime) return 0
  return minutesAfterTime(formatLocalTime(new Date(checkInTime)), cutoff)
}

function normalizeAttendanceRecord<T extends { check_in_time: string | null; status: string; late_minutes?: number | null }>(
  record: T,
  cutoff: string,
) {
  const effectiveLateMinutes = getEffectiveLateMinutes(record.check_in_time, cutoff)
  const effectiveStatus = record.check_in_time && effectiveLateMinutes > 0 ? 'Late' : record.status

  return {
    ...record,
    effective_status: effectiveStatus,
    effective_late_minutes: effectiveLateMinutes,
  }
}

function latestByUser<T extends { user_id: string; check_in_time: string | null }>(records: T[]) {
  const unique = new Map<string, T>()
  records.forEach((record) => {
    if (!unique.has(record.user_id)) {
      unique.set(record.user_id, record)
    }
  })
  return Array.from(unique.values())
}

function useDashboardRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('admin-dashboard-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['attendance'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => {
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['leaves'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        qc.invalidateQueries({ queryKey: ['dashboard'] })
        qc.invalidateQueries({ queryKey: ['users'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [qc])
}

export function useDashboardStats() {
  useDashboardRealtime()
  const today = formatLocalDate(new Date())
  const client = adminSupabase ?? supabase

  return useQuery({
    queryKey: ['dashboard', 'stats', today],
    queryFn: async (): Promise<DashboardStats & { lateArrivalsDetails: any[] }> => {
      const [activeEmployees, leavesRes, cutoff] = await Promise.all([
        getActiveEmployeeIds(client),
        client.from('leaves').select('id', { count: 'exact' }).eq('status', 'Pending'),
        getAttendanceCutoff(client),
      ])

      const totalEmployees = activeEmployees.count
      const pendingLeaves = leavesRes.count ?? 0
      let todayAttendance: any[] = []

      if (activeEmployees.ids.length > 0) {
        const { data, error } = await client
          .from('attendance')
          .select('status, user_id, check_in_time, late_minutes')
          .eq('date', today)
          .in('user_id', activeEmployees.ids)
          .order('check_in_time', { ascending: false })

        if (error) throw error
        todayAttendance = data ?? []
      }

      const profilesById = new Map(activeEmployees.profiles.map((profile) => [profile.id, profile]))
      const normalizedAttendance = todayAttendance.map((record) => ({
        ...normalizeAttendanceRecord(record, cutoff),
        profiles: profilesById.get(record.user_id),
      }))
      const uniqueRecords = latestByUser(normalizedAttendance)

      const presentToday = uniqueRecords.filter(r => r.effective_status === 'Present' || r.effective_status === 'Late' || r.effective_status === 'Half Day').length
      const absentToday = uniqueRecords.filter(r => r.effective_status === 'Absent').length
      const lateArrivalsToday = uniqueRecords.filter(r => r.effective_status === 'Late').length
      const markedCount = uniqueRecords.length
      const notMarkedToday = Math.max(0, totalEmployees - markedCount)

      const lateArrivalsDetails = uniqueRecords
        .filter(r => r.effective_status === 'Late')
        .sort((a, b) => new Date(b.check_in_time).getTime() - new Date(a.check_in_time).getTime())

      return { totalEmployees, presentToday, absentToday, notMarkedToday, lateArrivalsToday, pendingLeaves, lateArrivalsDetails }
    },
  })
}

export function useAttendanceTrend() {
  const client = adminSupabase ?? supabase
  return useQuery({
    queryKey: ['dashboard', 'trend'],
    queryFn: async () => {
      const days: string[] = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        days.push(formatLocalDate(d))
      }

      const [activeEmployees, cutoff] = await Promise.all([
        getActiveEmployeeIds(client),
        getAttendanceCutoff(client),
      ])
      if (activeEmployees.ids.length === 0) {
        return days.map(date => ({
          date: format(new Date(date + 'T00:00:00'), 'dd MMM'),
          present: 0,
          late: 0,
          absent: 0,
        }))
      }

      const { data, error } = await client
        .from('attendance')
        .select('date, status, user_id, check_in_time, late_minutes')
        .in('date', days)
        .in('user_id', activeEmployees.ids)
        .order('check_in_time', { ascending: false })
      if (error) throw error

      return days.map(date => {
        const rows = latestByUser(
          (data ?? [])
            .filter(r => r.date === date)
            .map((record) => normalizeAttendanceRecord(record, cutoff))
        )
        return {
          date: format(new Date(date + 'T00:00:00'), 'dd MMM'),
          present: rows.filter(r => r.effective_status === 'Present').length,
          late: rows.filter(r => r.effective_status === 'Late').length,
          absent: rows.filter(r => r.effective_status === 'Absent').length,
        }
      })
    },
  })
}

export function useTodayAttendanceGroups() {
  const today = formatLocalDate(new Date())
  const client = adminSupabase ?? supabase

  return useQuery({
    queryKey: ['dashboard', 'today-groups', today],
    queryFn: async () => {
      const [activeEmployees, cutoff] = await Promise.all([
        getActiveEmployeeIds(client),
        getAttendanceCutoff(client),
      ])

      const groups: Record<TodayAttendanceStatus, { id: string; name: string; category?: string; checkInTime?: string | null; lateMinutes?: number; status: TodayAttendanceStatus }[]> = {
        Present: [],
        Absent: [],
        Late: [],
        'Not Marked': [],
      }

      if (activeEmployees.ids.length === 0) return groups

      const { data, error } = await client
        .from('attendance')
        .select('status, user_id, category, check_in_time, late_minutes')
        .eq('date', today)
        .in('user_id', activeEmployees.ids)
        .order('check_in_time', { ascending: false })

      if (error) throw error

      const latestRecords = latestByUser((data ?? []).map((record) => normalizeAttendanceRecord(record, cutoff)))
      const recordsByUser = new Map(latestRecords.map((record) => [record.user_id, record]))

      activeEmployees.profiles.forEach((profile) => {
        const record = recordsByUser.get(profile.id)
        const employee = {
          id: profile.id,
          name: profile.full_name,
          category: record?.category ?? profile.category,
          checkInTime: record?.check_in_time,
          lateMinutes: record?.effective_late_minutes,
          status: 'Not Marked' as TodayAttendanceStatus,
        }

        if (!record || record.effective_status === 'Not Marked') {
          groups['Not Marked'].push(employee)
          return
        }

        if (record.effective_status === 'Late') {
          groups.Late.push({ ...employee, status: 'Late' })
        } else if (record.effective_status === 'Absent') {
          groups.Absent.push({ ...employee, status: 'Absent' })
        } else {
          groups.Present.push({ ...employee, status: 'Present' })
        }
      })

      Object.values(groups).forEach((employees) => employees.sort((a, b) => a.name.localeCompare(b.name)))

      return groups
    },
  })
}

export function useSaveTodayAttendanceStatuses() {
  const qc = useQueryClient()
  const today = formatLocalDate(new Date())
  const client = adminSupabase ?? supabase

  return useMutation({
    mutationFn: async (updates: { userId: string; status: TodayAttendanceStatus; category?: string }[]) => {
      const now = new Date().toISOString()

      for (const update of updates) {
        const { data: existing, error: existingError } = await client
          .from('attendance')
          .select('id, check_in_time')
          .eq('user_id', update.userId)
          .eq('date', today)
          .order('check_in_time', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle()

        if (existingError) throw existingError

        const status = update.status
        const shouldClearCheckIn = status === 'Not Marked'
        const checkInTime = status === 'Absent' || shouldClearCheckIn
          ? null
          : existing?.check_in_time ?? now

        const payload = {
          user_id: update.userId,
          category: update.category ?? 'Office',
          status,
          check_in_time: checkInTime,
          late_minutes: status === 'Late' ? 1 : 0,
          date: today,
        }

        if (existing?.id) {
          const { error } = await client
            .from('attendance')
            .update(payload)
            .eq('id', existing.id)
          if (error) throw error
        } else if (!shouldClearCheckIn) {
          const { error } = await client
            .from('attendance')
            .insert(payload)
          if (error) throw error
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['attendance'] })
      toast.success('Attendance statuses saved')
    },
    onError: (err: Error) => toast.error('Failed to save attendance', err.message),
  })
}

export function useAttendancePieData() {
  const today = formatLocalDate(new Date())
  const client = adminSupabase ?? supabase
  return useQuery({
    queryKey: ['dashboard', 'pie', today],
    queryFn: async () => {
      const [activeEmployees, cutoff] = await Promise.all([
        getActiveEmployeeIds(client),
        getAttendanceCutoff(client),
      ])
      if (activeEmployees.ids.length === 0) return []

      const { data, error } = await client
        .from('attendance')
        .select('status, user_id, check_in_time, late_minutes')
        .eq('date', today)
        .in('user_id', activeEmployees.ids)
        .order('check_in_time', { ascending: false })
      if (error) throw error

      const counts: Record<string, number> = {}
      latestByUser((data ?? []).map((record) => normalizeAttendanceRecord(record, cutoff)))
        .forEach(r => { counts[r.effective_status] = (counts[r.effective_status] ?? 0) + 1 })

      return [
        { name: 'Present', value: counts['Present'] ?? 0, color: '#10b981' },
        { name: 'Late', value: counts['Late'] ?? 0, color: '#f59e0b' },
        { name: 'Absent', value: counts['Absent'] ?? 0, color: '#ef4444' },
        { name: 'Half Day', value: counts['Half Day'] ?? 0, color: '#6366f1' },
      ].filter(item => item.value > 0)
    },
  })
}
