import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, adminSupabase } from '@/lib/supabase'
import type { Attendance, Profile } from '@/types'
import { toast } from '@/hooks/useToast'
import { formatLocalDate } from '@/lib/date'

interface AttendanceFilters {
  userId?: string
  category?: string
  startDate: string
  endDate: string
}

export function useAttendance(filters: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', filters],
    queryFn: async () => {
      const client = adminSupabase ?? supabase
      let query = client
        .from('attendance')
        .select('*')
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false })

      if (filters.userId) query = query.eq('user_id', filters.userId)
      if (filters.category && filters.category !== 'All') query = query.eq('category', filters.category)

      const { data, error } = await query
      if (error) throw error

      const attendance = (data ?? []) as Attendance[]
      const userIds = Array.from(new Set(attendance.map((record) => record.user_id).filter(Boolean)))

      if (userIds.length === 0) return attendance

      const { data: profiles, error: profilesError } = await client
        .from('profiles')
        .select('id, employee_id, full_name, category')
        .in('id', userIds)

      if (profilesError) {
        console.warn('Unable to load attendance profiles:', profilesError)
        return attendance
      }

      const profilesById = new Map((profiles as Profile[] | null)?.map((profile) => [profile.id, profile]))
      return attendance.map((record) => ({
        ...record,
        profiles: profilesById.get(record.user_id),
      }))
    },
  })
}

export function useAttendanceByDate(date: string) {
  return useQuery({
    queryKey: ['attendance', 'date', date],
    queryFn: async () => {
      const client = adminSupabase ?? supabase
      const { data, error } = await client
        .from('attendance')
        .select('*')
        .eq('date', date)
        .order('check_in_time', { ascending: true })
      if (error) throw error

      const attendance = (data ?? []) as Attendance[]
      const userIds = Array.from(new Set(attendance.map((record) => record.user_id).filter(Boolean)))

      if (userIds.length === 0) return attendance

      const { data: profiles, error: profilesError } = await client
        .from('profiles')
        .select('id, employee_id, full_name, category')
        .in('id', userIds)

      if (profilesError) {
        console.warn('Unable to load attendance profiles:', profilesError)
        return attendance
      }

      const profilesById = new Map((profiles as Profile[] | null)?.map((profile) => [profile.id, profile]))
      return attendance.map((record) => ({
        ...record,
        profiles: profilesById.get(record.user_id),
      }))
    },
  })
}

export function useUpdateAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Attendance> & { id: string }) => {
      const { id, profiles: _p, ...rest } = payload
      const client = adminSupabase ?? supabase
      const { error } = await client.from('attendance').update(rest).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Attendance record updated')
    },
    onError: (err: Error) => toast.error('Failed to update attendance', err.message),
  })
}

export function useDeleteAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const client = adminSupabase ?? supabase
      const { error } = await client.from('attendance').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Attendance record deleted')
    },
    onError: (err: Error) => toast.error('Failed to delete attendance', err.message),
  })
}

export function useMonthlyAttendanceStats(year: number, month: number) {
  return useQuery({
    queryKey: ['attendance', 'monthly', year, month],
    queryFn: async () => {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const endDate = formatLocalDate(new Date(year, month, 0))

      const client = adminSupabase ?? supabase
      const { data, error } = await client
        .from('attendance')
        .select('date, status')
        .gte('date', startDate)
        .lte('date', endDate)
      if (error) throw error

      // Group by date
      const byDate: Record<string, { present: number; absent: number; late: number; halfDay: number }> = {}
      data.forEach(row => {
        if (!byDate[row.date]) byDate[row.date] = { present: 0, absent: 0, late: 0, halfDay: 0 }
        if (row.status === 'Present') byDate[row.date].present++
        else if (row.status === 'Absent') byDate[row.date].absent++
        else if (row.status === 'Late') byDate[row.date].late++
        else if (row.status === 'Half Day') byDate[row.date].halfDay++
      })

      return Object.entries(byDate).map(([date, counts]) => ({
        date,
        ...counts,
      })).sort((a, b) => a.date.localeCompare(b.date))
    },
  })
}
