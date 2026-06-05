import { useEffect, useMemo, useState } from 'react'
import { useDashboardStats, useAttendancePieData, useSaveTodayAttendanceStatuses, useTodayAttendanceGroups, type TodayAttendanceStatus } from '@/hooks/useDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, UserX, Clock, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { cn, formatMinutes, formatTime } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const TODAY_STATUSES: TodayAttendanceStatus[] = ['Present', 'Absent', 'Late', 'Not Marked']

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: pieData, isLoading: pieLoading } = useAttendancePieData()
  const { data: todayGroups, isLoading: groupsLoading } = useTodayAttendanceGroups()
  const { mutate: saveTodayStatuses, isPending: isSavingStatuses } = useSaveTodayAttendanceStatuses()
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [draftStatuses, setDraftStatuses] = useState<Record<string, TodayAttendanceStatus>>({})

  const todayEmployees = useMemo(() => {
    return TODAY_STATUSES.flatMap((status) => todayGroups?.[status] ?? [])
  }, [todayGroups])

  useEffect(() => {
    if (!todayGroups) return
    setDraftStatuses(
      Object.fromEntries(todayEmployees.map((employee) => [employee.id, employee.status]))
    )
  }, [todayGroups, todayEmployees])

  const kpis = [
    { title: 'Total Employees', value: stats?.totalEmployees ?? 0, icon: Users, color: 'text-blue-500', glow: 'kpi-glow-blue' },
    { title: 'Present Today', value: stats?.presentToday ?? 0, icon: UserCheck, color: 'text-emerald-500', glow: 'kpi-glow-green' },
    { title: 'Absent Today', value: stats?.absentToday ?? 0, icon: UserX, color: 'text-red-500', glow: 'kpi-glow-red' },
    { title: 'Late Arrivals', value: stats?.lateArrivalsToday ?? 0, icon: Clock, color: 'text-amber-500', glow: 'kpi-glow-amber' },
    { title: 'Not Marked', value: stats?.notMarkedToday ?? 0, icon: AlertCircle, color: 'text-muted-foreground', glow: '' },
  ]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className={cn('overflow-hidden transition-all duration-200 hover:scale-[1.02]', kpi.glow)}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
              <div className={cn('p-3 rounded-full bg-secondary', kpi.color)}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? '-' : kpi.value}
                </p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today's Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-sm font-semibold">Today's Attendance Status</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {isEditingStatus ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingStatus(false)} disabled={isSavingStatuses}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    loading={isSavingStatuses}
                    onClick={() => {
                      saveTodayStatuses(
                        todayEmployees.map((employee) => ({
                          userId: employee.id,
                          status: draftStatuses[employee.id] ?? employee.status,
                          category: employee.category,
                        })),
                        { onSuccess: () => setIsEditingStatus(false) }
                      )
                    }}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditingStatus(true)}>
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {groupsLoading ? (
              <div className="w-full min-h-[260px] shimmer rounded-lg" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px] text-emerald-500">Present</TableHead>
                      <TableHead className="min-w-[180px] text-red-500">Absent</TableHead>
                      <TableHead className="min-w-[180px] text-amber-500">Late</TableHead>
                      <TableHead className="min-w-[180px] text-muted-foreground">Not Marked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="align-top hover:bg-transparent">
                      {(['Present', 'Absent', 'Late', 'Not Marked'] as const).map((status) => {
                        const employees = todayGroups?.[status] ?? []
                        return (
                          <TableCell key={status} className="align-top">
                            {employees.length === 0 ? (
                              <p className="text-sm text-muted-foreground">-</p>
                            ) : (
                              <div className="space-y-2">
                                {employees.map((employee) => (
                                  <div key={employee.id} className="rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
                                    {isEditingStatus ? (
                                      <div className="space-y-2">
                                        <p className="text-sm font-medium text-foreground">{employee.name}</p>
                                        <Select
                                          value={draftStatuses[employee.id] ?? employee.status}
                                          onValueChange={(value) => setDraftStatuses((prev) => ({
                                            ...prev,
                                            [employee.id]: value as TodayAttendanceStatus,
                                          }))}
                                        >
                                          <SelectTrigger className="h-8">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {TODAY_STATUSES.map((option) => (
                                              <SelectItem key={option} value={option}>{option}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ) : (
                                      <p className="text-sm font-medium text-foreground">{employee.name}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Today's Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px] flex items-center justify-center">
            {pieLoading ? (
              <div className="w-48 h-48 rounded-full shimmer" />
            ) : pieData?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--popover))' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground text-sm">No attendance data for today</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Late Arrivals Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Late Arrivals Today</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Check-in Time</TableHead>
                <TableHead>Late By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : !stats?.lateArrivalsDetails || stats.lateArrivalsDetails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">No late arrivals today</TableCell>
                </TableRow>
              ) : (
                stats.lateArrivalsDetails.map((record: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{record.profiles?.full_name ?? 'Unknown employee'}</TableCell>
                    <TableCell className="text-amber-600 font-semibold">{formatTime(record.check_in_time)}</TableCell>
                    <TableCell className="text-amber-600 font-semibold">{formatMinutes(record.effective_late_minutes)}</TableCell>
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
