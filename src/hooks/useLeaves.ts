import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, adminSupabase } from '@/lib/supabase'
import type { Leave, LeaveStatus, Profile } from '@/types'
import { toast } from '@/hooks/useToast'

export function useLeaves(status?: LeaveStatus | 'All') {
  return useQuery({
    queryKey: ['leaves', status],
    queryFn: async () => {
      const client = adminSupabase ?? supabase
      let query = client
        .from('leaves')
        .select('*')
        .order('created_at', { ascending: false })

      if (status && status !== 'All') query = query.ilike('status', status)

      const { data, error } = await query
      if (error) throw error

      const leaves = (data ?? []) as Leave[]
      const userIds = Array.from(new Set(leaves.map((leave) => leave.user_id).filter(Boolean)))

      if (userIds.length === 0) return leaves

      const { data: profiles, error: profilesError } = await client
        .from('profiles')
        .select('id, employee_id, full_name, category, casual_leaves_balance, sick_leaves_balance, earned_leaves_balance')
        .in('id', userIds)

      if (profilesError) {
        console.warn('Unable to load leave applicant profiles:', profilesError)
        return leaves
      }

      const profilesById = new Map((profiles as Profile[] | null)?.map((profile) => [profile.id, profile]))

      return leaves.map((leave) => ({
        ...leave,
        profiles: profilesById.get(leave.user_id),
      }))
    },
  })
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      admin_note,
    }: {
      id: string
      status: LeaveStatus
      admin_note?: string
      leaveType?: string
      userId?: string
    }) => {
      const client = adminSupabase ?? supabase
      const { error } = await client
        .from('leaves')
        .update({ status, admin_note })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['leaves'] })
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(`Leave ${vars.status.toLowerCase()} successfully`)
    },
    onError: (err: Error) => toast.error('Failed to update leave', err.message),
  })
}

export function useLeaveDistribution() {
  return useQuery({
    queryKey: ['leaves', 'distribution'],
    queryFn: async () => {
      const client = adminSupabase ?? supabase
      const { data, error } = await client
        .from('leaves')
        .select('type, status')
      if (error) throw error

      const dist: Record<string, { approved: number; pending: number; rejected: number }> = {
        'Casual Leave': { approved: 0, pending: 0, rejected: 0 },
        'Sick Leave': { approved: 0, pending: 0, rejected: 0 },
        'Earned Leave': { approved: 0, pending: 0, rejected: 0 },
      }
      data.forEach(row => {
        if (dist[row.type]) {
          const s = row.status.toLowerCase() as 'approved' | 'pending' | 'rejected'
          if (dist[row.type][s] !== undefined) dist[row.type][s]++
        }
      })

      return Object.entries(dist).map(([name, counts]) => ({ name, ...counts }))
    },
  })
}
