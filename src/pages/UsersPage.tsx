import { useState } from 'react'
import { useUsers, useToggleUserStatus, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

import { AlertTriangle, Search, Plus, Trash2, UserCog } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Profile } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function UsersPage() {
  const { data: users, isLoading } = useUsers()
  const { mutate: toggleStatus } = useToggleUserStatus()
  const { mutate: createUser, isPending: isCreating } = useCreateUser()
  const { mutate: updateUser, isPending: isUpdating } = useUpdateUser()
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteUser()
  
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)

  // Create Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const generateEmployeeId = (existingUsers: Profile[]) => {
    const nums = existingUsers
      .map(u => parseInt(u.employee_id?.replace(/\D/g, '') || '0'))
      .filter(n => !isNaN(n))
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1
    return `WTP-${String(next).padStart(4, '0')}`
  }
  
  // Edit Form State
  const [editFullName, setEditFullName] = useState('')
  const [editEmployeeId, setEditEmployeeId] = useState('')
  const [editCL, setEditCL] = useState('4')
  const [editSL, setEditSL] = useState('4')
  const [editEL, setEditEL] = useState('0')
  const [editWorkingDays, setEditWorkingDays] = useState<string[] | null>(null)
  const [editSecondSaturdayOff, setEditSecondSaturdayOff] = useState<boolean | null>(null)

  const filtered = users?.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.employee_id.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    const autoId = generateEmployeeId(users ?? [])
    createUser(
      {
        email,
        password,
        full_name: fullName,
        employee_id: autoId,
        casual_leaves_balance: 4,
        sick_leaves_balance: 4,
        earned_leaves_balance: 0,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false)
          setEmail('')
          setPassword('')
          setFullName('')
        }
      }
    )
  }

  const openEdit = (user: Profile) => {
    setEditUser(user)
    setEditFullName(user.full_name)
    setEditEmployeeId(user.employee_id)
    setEditCL(user.casual_leaves_balance.toString())
    setEditSL(user.sick_leaves_balance.toString())
    setEditEL(user.earned_leaves_balance.toString())
    setEditWorkingDays(user.working_days ?? null)
    setEditSecondSaturdayOff(user.second_saturday_off ?? null)
  }

  const toggleEditDay = (day: string) => {
    setEditWorkingDays(prev => {
      const current = prev ?? DAYS.slice(0, 5) // default to Mon-Fri if null
      return current.includes(day) ? current.filter(d => d !== day) : [...current, day]
    })
  }

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    updateUser(
      {
        id: editUser.id,
        full_name: editFullName,
        employee_id: editEmployeeId,
        casual_leaves_balance: parseInt(editCL),
        sick_leaves_balance: parseInt(editSL),
        earned_leaves_balance: parseInt(editEL),
        working_days: editWorkingDays,
        second_saturday_off: editSecondSaturdayOff,
      },
      {
        onSuccess: () => {
          setEditUser(null)
        }
      }
    )
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteUser(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Leave Balance (C/S/E)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading employees...
                  </TableCell>
                </TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                filtered?.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.employee_id}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>
                      {user.casual_leaves_balance} / {user.sick_leaves_balance} / {user.earned_leaves_balance}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'active' ? 'success' : 'secondary'}>
                        {user.status === 'active' ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" title="Edit Employee" onClick={() => openEdit(user)}>
                          <UserCog className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete Employee"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={user.status === 'active' ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => toggleStatus({ id: user.id, is_active: user.status !== 'active' })}
                        >
                          {user.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Employee ID will be auto-generated.</p>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required placeholder="e.g. Ramesh Kumar" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gmail Address</Label>
              <Input required type="email" placeholder="employee@gmail.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <Input required placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isCreating}>Create Employee</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              This will permanently delete {deleteTarget?.full_name || 'this employee'}, their login account, attendance records, and leave requests.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-muted-foreground">
            Employee ID: <span className="font-medium text-foreground">{deleteTarget?.employee_id}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" loading={isDeleting} onClick={handleDelete}>
              Delete Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={editFullName} onChange={e => setEditFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input required value={editEmployeeId} onChange={e => setEditEmployeeId(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t pt-4 mt-2">
              <div className="space-y-2">
                <Label>Casual Leave</Label>
                <Input type="number" required value={editCL} onChange={e => setEditCL(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sick Leave</Label>
                <Input type="number" required value={editSL} onChange={e => setEditSL(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Earned Leave</Label>
                <Input type="number" required value={editEL} onChange={e => setEditEL(e.target.value)} />
              </div>
            </div>
            
            <div className="border-t pt-4 mt-2 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Override Working Days?</Label>
                <Checkbox 
                  checked={editWorkingDays !== null} 
                  onCheckedChange={(c) => setEditWorkingDays(c ? DAYS.slice(0, 5) : null)} 
                />
              </div>
              {editWorkingDays !== null && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {DAYS.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-day-${day}`}
                        checked={editWorkingDays.includes(day)}
                        onCheckedChange={() => toggleEditDay(day)}
                      />
                      <Label htmlFor={`edit-day-${day}`} className="text-xs">{day.slice(0,3)}</Label>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <Label>Override Second Saturday Off?</Label>
                <Checkbox 
                  checked={editSecondSaturdayOff !== null} 
                  onCheckedChange={(c) => setEditSecondSaturdayOff(c ? true : null)} 
                />
              </div>
              {editSecondSaturdayOff !== null && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-sec-sat"
                    checked={editSecondSaturdayOff} 
                    onCheckedChange={(c) => setEditSecondSaturdayOff(c as boolean)} 
                  />
                  <Label htmlFor="edit-sec-sat">Second Saturday Off</Label>
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button type="submit" loading={isUpdating}>Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
