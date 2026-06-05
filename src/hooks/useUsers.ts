import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, adminSupabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import { toast } from '@/hooks/useToast'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Use service role client to bypass RLS — admin should see all users
      const client = adminSupabase ?? supabase
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .or('role.is.null,role.neq.admin')
        .order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      email: string
      password: string
      employee_id: string
      full_name: string
      casual_leaves_balance: number
      sick_leaves_balance: number
      earned_leaves_balance: number
    }) => {
      let userId: string

      if (!adminSupabase) {
        throw new Error('Admin client not configured. Check VITE_SUPABASE_SERVICE_ROLE_KEY in .env')
      }

      // Attempt to create the user directly
      const { data: createData, error: createError } = await adminSupabase.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: { full_name: payload.full_name, role: 'employee' },
      })

      if (createError) {
        const isAlreadyExists =
          createError.message.toLowerCase().includes('already') ||
          createError.message.toLowerCase().includes('registered') ||
          createError.message.toLowerCase().includes('exists')

        if (!isAlreadyExists) throw createError

        // Ghost user recovery: find the existing auth user by email and repurpose them
        console.log('[useCreateUser] Email already exists in auth — attempting ghost user recovery...')
        const { data: listData, error: listError } = await adminSupabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        })
        if (listError) throw listError

        const existingUser = listData?.users.find(
          (u) => u.email?.toLowerCase() === payload.email.toLowerCase()
        )
        if (!existingUser) throw new Error(`User with email ${payload.email} not found after conflict. Try a different email.`)

        // Update password and confirm their email so they can log in
        const { error: updateError } = await adminSupabase.auth.admin.updateUserById(existingUser.id, {
          password: payload.password,
          email_confirm: true,
          user_metadata: { full_name: payload.full_name, role: 'employee' },
        })
        if (updateError) throw updateError

        userId = existingUser.id
        console.log('[useCreateUser] Ghost user recovered successfully:', userId)
      } else {
        if (!createData.user) throw new Error('User creation failed')
        userId = createData.user.id
      }

      // Upsert profile using service role client to bypass RLS
      const { error: profileError } = await adminSupabase.from('profiles').upsert({
        id: userId,
        email: payload.email,
        employee_id: payload.employee_id,
        full_name: payload.full_name,
        casual_leaves_balance: payload.casual_leaves_balance,
        sick_leaves_balance: payload.sick_leaves_balance,
        earned_leaves_balance: payload.earned_leaves_balance,
        role: 'employee',
        status: 'active',
      })
      if (profileError) throw profileError
      return userId
    },

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Employee created successfully')
    },
    onError: (err: Error) => toast.error('Failed to create employee', err.message),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Profile> & { id: string }) => {
      const { id, ...rest } = payload
      const client = adminSupabase ?? supabase
      const { error } = await client.from('profiles').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Employee updated successfully')
    },
    onError: (err: Error) => toast.error('Failed to update employee', err.message),
  })
}

export function useToggleUserStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const client = adminSupabase!
      const { error } = await client.from('profiles').update({ status: is_active ? 'active' : 'inactive', updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(`Employee ${vars.is_active ? 'enabled' : 'disabled'} successfully`)
    },
    onError: (err: Error) => toast.error('Failed to update status', err.message),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      if (!adminSupabase) {
        throw new Error('Admin client not configured. Check VITE_SUPABASE_SERVICE_ROLE_KEY in .env')
      }

      const tables = ['attendance', 'leaves', 'profiles'] as const
      for (const table of tables) {
        const column = table === 'profiles' ? 'id' : 'user_id'
        const { error } = await adminSupabase.from(table).delete().eq(column, id)
        if (error) throw error
      }

      const { error: authError } = await adminSupabase.auth.admin.deleteUser(id)
      if (authError) throw authError
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['attendance'] })
      qc.invalidateQueries({ queryKey: ['leaves'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Employee deleted successfully')
    },
    onError: (err: Error) => toast.error('Failed to delete employee', err.message),
  })
}

export function useUpdateLeaveBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      id: string
      casual_leaves_balance?: number
      sick_leaves_balance?: number
      earned_leaves_balance?: number
    }) => {
      const { id, ...rest } = payload
      const client = adminSupabase ?? supabase
      const { error } = await client.from('profiles').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Leave balances updated')
    },
    onError: (err: Error) => toast.error('Failed to update balances', err.message),
  })
}
