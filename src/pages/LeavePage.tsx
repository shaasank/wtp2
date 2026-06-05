import { useState } from 'react'
import { useLeaves, useUpdateLeaveStatus } from '@/hooks/useLeaves'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, getLeaveStatusColor } from '@/lib/utils'
import type { LeaveStatus } from '@/types'
import { CheckCircle2, XCircle } from 'lucide-react'

export default function LeavePage() {
  const [filter, setFilter] = useState<LeaveStatus | 'All'>('Pending')
  const { data: leaves, isLoading } = useLeaves(filter)
  const { mutate: updateStatus, isPending } = useUpdateLeaveStatus()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as LeaveStatus | 'All')} className="w-full sm:w-auto">
          <TabsList className="w-full sm:w-auto grid grid-cols-4 h-auto">
            <TabsTrigger value="Pending" className="py-2">Pending</TabsTrigger>
            <TabsTrigger value="Approved" className="py-2">Approved</TabsTrigger>
            <TabsTrigger value="Rejected" className="py-2">Rejected</TabsTrigger>
            <TabsTrigger value="All" className="py-2">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Leave Type</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading leave requests...
                  </TableCell>
                </TableRow>
              ) : leaves?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No leave requests found
                  </TableCell>
                </TableRow>
              ) : (
                leaves?.map(leave => (
                  <TableRow key={leave.id}>
                    <TableCell>
                      <p className="font-medium">{leave.profiles?.full_name ?? 'Unknown employee'}</p>
                      <p className="text-xs text-muted-foreground">
                        {leave.profiles
                          ? `Bal: C:${leave.profiles.casual_leaves_balance} S:${leave.profiles.sick_leaves_balance} E:${leave.profiles.earned_leaves_balance}`
                          : `User ID: ${leave.user_id}`}
                      </p>
                    </TableCell>
                    <TableCell>{leave.type}</TableCell>
                    <TableCell>{leave.duration}</TableCell>
                    <TableCell>
                      {formatDate(leave.start_date)}
                      {leave.start_date !== leave.end_date && ` - ${formatDate(leave.end_date)}`}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={leave.reason}>
                      {leave.reason}
                    </TableCell>
                    <TableCell>
                      <Badge className={getLeaveStatusColor(leave.status)}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {leave.status === 'Pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            title="Approve"
                            disabled={isPending}
                            onClick={() => updateStatus({ id: leave.id, status: 'Approved', leaveType: leave.type, userId: leave.user_id })}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            title="Reject"
                            disabled={isPending}
                            onClick={() => updateStatus({ id: leave.id, status: 'Rejected' })}
                          >
                            <XCircle className="w-5 h-5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
