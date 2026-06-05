import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, adminSupabase } from '@/lib/supabase'
import type { AttendanceSettings } from '@/types'
import { toast } from '@/hooks/useToast'

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const client = adminSupabase ?? supabase
      const { data, error } = await client
        .from('attendance_settings')
        .select('*')
        .single()
      if (error && error.code !== 'PGRST116') throw error
      return (data as AttendanceSettings) ?? {
        id: '',
        check_in_cutoff: '09:30:00',
        auto_logout_time: '18:00:00',
        working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        updated_at: '',
      }
    },
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<AttendanceSettings>) => {
      const client = adminSupabase ?? supabase
      const { data: existing } = await client
        .from('attendance_settings')
        .select('id')
        .single()

      if (existing?.id) {
        const { error } = await client
          .from('attendance_settings')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await client
          .from('attendance_settings')
          .insert({ ...payload, updated_at: new Date().toISOString() })
        if (error) throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Attendance policy saved')
    },
    onError: (err: Error) => toast.error('Failed to save policy', err.message),
  })
}
