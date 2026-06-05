import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { BriefcaseBusiness, Building2, Factory, MapPinned, RefreshCw, Users } from 'lucide-react'
import { useAttendanceByDate, useUpdateAttendance } from '@/hooks/useAttendance'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatLocalDate } from '@/lib/date'
import type { Attendance, WorkCategory } from '@/types'

const categories: {
  value: WorkCategory
  label: string
  icon: typeof Building2
  badge: 'info' | 'warning' | 'success'
}[] = [
  { value: 'Office', label: 'Office', icon: Building2, badge: 'info' },
  { value: 'Field', label: 'Field', icon: MapPinned, badge: 'success' },
  { value: 'Mill', label: 'Mill', icon: Factory, badge: 'warning' },
]

function formatTime(value: string | null) {
  if (!value) return '-'
  return format(new Date(value), 'hh:mm a')
}

function latestByUser(records: Attendance[]) {
  const map = new Map<string, Attendance>()

  records.forEach((record) => {
    const existing = map.get(record.user_id)
    const recordTime = new Date(record.check_in_time ?? record.created_at).getTime()
    const existingTime = existing ? new Date(existing.check_in_time ?? existing.created_at).getTime() : 0

    if (!existing || recordTime > existingTime) {
      map.set(record.user_id, record)
    }
  })

  return Array.from(map.values())
}

export default function CategoryHistoryPage() {
  const [selectedDate, setSelectedDate] = useState(formatLocalDate(new Date()))
  const { data: records, isLoading, refetch, isFetching } = useAttendanceByDate(selectedDate)
  const updateAttendance = useUpdateAttendance()

  const grouped = useMemo(() => {
    const latestRecords = latestByUser((records ?? []).filter((record) => Boolean(record.check_in_time)))
    const byCategory = new Map<WorkCategory, Attendance[]>()
    categories.forEach((category) => byCategory.set(category.value, []))

    latestRecords.forEach((record) => {
      const category = record.category
      if (!byCategory.has(category)) byCategory.set(category, [])
      byCategory.get(category)?.push(record)
    })

    byCategory.forEach((items) => {
      items.sort((a, b) => {
        const aName = a.profiles?.full_name ?? ''
        const bName = b.profiles?.full_name ?? ''
        return aName.localeCompare(bName)
      })
    })

    return byCategory
  }, [records])

  const totalCheckedIn = useMemo(() => {
    return categories.reduce((total, category) => total + (grouped.get(category.value)?.length ?? 0), 0)
  }, [grouped])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Category History</h2>
          <p className="text-sm text-muted-foreground">Daily check-in work category view</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="space-y-1">
            <label htmlFor="category-date" className="text-xs font-medium text-muted-foreground">
              Date
            </label>
            <Input
              id="category-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-[170px]"
            />
          </div>
          <Button variant="outline" onClick={() => refetch()} loading={isFetching}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Checked In</p>
                <p className="mt-1 text-2xl font-bold">{totalCheckedIn}</p>
              </div>
              <Users className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>
        {categories.map((category) => {
          const Icon = category.icon
          const count = grouped.get(category.value)?.length ?? 0

          return (
            <Card key={category.value} className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{category.label}</p>
                    <p className="mt-1 text-2xl font-bold">{count}</p>
                  </div>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {categories.map((category) => {
          const Icon = category.icon
          const items = grouped.get(category.value) ?? []

          return (
            <Card key={category.value} className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-4 w-4 text-primary" />
                  {category.label}
                </CardTitle>
                <Badge variant={category.badge}>{items.length} users</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div className="min-w-[590px]">
                    <div className="grid grid-cols-[92px_minmax(130px,1fr)_94px_116px_96px] border-b border-border/50 px-5 py-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <div className="whitespace-nowrap">E Code</div>
                      <div className="min-w-0 whitespace-nowrap">Name</div>
                      <div className="whitespace-nowrap">Check In</div>
                      <div className="whitespace-nowrap">Category</div>
                      <div className="whitespace-nowrap text-right">Status</div>
                    </div>
                    {isLoading ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
                    ) : items.length === 0 ? (
                      <div className="py-8 text-center text-sm text-muted-foreground">No check-ins</div>
                    ) : (
                      items.map((record) => (
                        <div
                          key={record.id}
                          className="grid grid-cols-[92px_minmax(130px,1fr)_94px_116px_96px] items-center border-b border-border/50 px-5 py-3 text-sm last:border-b-0"
                        >
                          <div className="whitespace-nowrap font-semibold tabular-nums">
                            {record.profiles?.employee_id ?? '-'}
                          </div>
                          <div className="min-w-0 pr-3">
                            <p className="truncate font-medium">
                              {record.profiles?.full_name ?? 'Unknown employee'}
                            </p>
                          </div>
                          <div className="whitespace-nowrap font-medium tabular-nums">
                            {formatTime(record.check_in_time)}
                          </div>
                          <div>
                            <Select
                              value={record.category}
                              disabled={updateAttendance.isPending}
                              onValueChange={(value) => {
                                const nextCategory = value as WorkCategory
                                if (nextCategory === record.category) return
                                updateAttendance.mutate({ id: record.id, category: nextCategory })
                              }}
                            >
                              <SelectTrigger className="h-8 w-[100px] bg-background px-2 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                record.status === 'Present'
                                  ? 'success'
                                  : record.status === 'Late'
                                    ? 'warning'
                                    : 'secondary'
                              }
                            >
                              {record.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!isLoading && totalCheckedIn === 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <BriefcaseBusiness className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No category history for this date</p>
            <p className="text-sm text-muted-foreground">
              Records will appear here after employees check in from the mobile app.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
