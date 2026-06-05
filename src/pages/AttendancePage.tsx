import { useEffect, useMemo, useState } from 'react'
import { useAttendance } from '@/hooks/useAttendance'
import { useUsers } from '@/hooks/useUsers'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { ChevronLeft, ChevronRight, FileSpreadsheet, Pencil, Save, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from '@/hooks/useToast'
import { adminSupabase, supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

type SheetCode = '' | 'P' | 'L'

const codeOptions: SheetCode[] = ['', 'P', 'L']
const DISPLAY_DAY_COUNT = 31

function recordToCode(status: string): SheetCode {
  if (status === 'Present' || status === 'Half Day') return 'P'
  if (status === 'Absent' || status === 'Late') return 'L'
  return ''
}

function codeToStatus(code: SheetCode) {
  if (code === 'P') return 'Present'
  if (code === 'L') return 'Absent'
  return 'Not Marked'
}

function cellKey(userId: string, date: string) {
  return `${userId}:${date}`
}

function isHighlightedOffDay(day: Date) {
  const date = day.getDate()
  const isSunday = day.getDay() === 0
  const isSecondSaturday = day.getDay() === 6 && date >= 8 && date <= 14
  return isSunday || isSecondSaturday
}

function isSameMonthDate(day: Date, month: Date) {
  return day.getMonth() === month.getMonth()
}

export default function AttendancePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [draft, setDraft] = useState<Record<string, SheetCode>>({})

  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: records, isLoading: recordsLoading, refetch } = useAttendance({ startDate, endDate, category: 'All' })

  const isLoading = usersLoading || recordsLoading
  const client = adminSupabase ?? supabase

  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  }, [currentMonth])

  const displayDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return Array.from({ length: DISPLAY_DAY_COUNT }, (_, index) => new Date(year, month, index + 1))
  }, [currentMonth])

  const latestRecordByCell = useMemo(() => {
    const map = new Map<string, NonNullable<typeof records>[number]>()
    ;(records ?? []).forEach((record) => {
      const key = cellKey(record.user_id, record.date)
      const existing = map.get(key)
      if (!existing || new Date(record.check_in_time ?? record.created_at).getTime() > new Date(existing.check_in_time ?? existing.created_at).getTime()) {
        map.set(key, record)
      }
    })
    return map
  }, [records])

  const baseCodes = useMemo(() => {
    const codes: Record<string, SheetCode> = {}
    const registerUsers = new Map<string, Profile>()
    ;(users ?? []).forEach((user) => registerUsers.set(user.id, user))
    ;(records ?? []).forEach((record) => {
      if (record.profiles && !registerUsers.has(record.user_id)) {
        registerUsers.set(record.user_id, record.profiles)
      }
    })

    Array.from(registerUsers.values()).forEach((user) => {
      daysInMonth.forEach((day) => {
        const date = format(day, 'yyyy-MM-dd')
        const record = latestRecordByCell.get(cellKey(user.id, date))
        codes[cellKey(user.id, date)] = record ? recordToCode(record.status) : ''
      })
    })
    return codes
  }, [daysInMonth, latestRecordByCell, records, users])

  useEffect(() => {
    if (!isEditing) setDraft(baseCodes)
  }, [baseCodes, isEditing])

  const gridData = useMemo(() => {
    const registerUsers = new Map<string, Profile>()
    ;(users ?? []).forEach((user) => registerUsers.set(user.id, user))
    ;(records ?? []).forEach((record) => {
      if (record.profiles && !registerUsers.has(record.user_id)) {
        registerUsers.set(record.user_id, record.profiles)
      }
    })

    return Array.from(registerUsers.values()).map((user, index) => {
      const attendance: Record<string, SheetCode> = {}
      let totalPresent = 0
      let totalLeave = 0

      displayDays.forEach((day, dayIndex) => {
        const dayNumber = String(dayIndex + 1)
        const isValidMonthDay = isSameMonthDate(day, currentMonth)
        const date = isValidMonthDay ? format(day, 'yyyy-MM-dd') : ''
        const code = date ? (isEditing ? draft[cellKey(user.id, date)] : baseCodes[cellKey(user.id, date)]) ?? '' : ''
        attendance[dayNumber] = code
        if (code === 'P') totalPresent++
        if (code === 'L') totalLeave++
      })

      return {
        serial: index + 1,
        id: user.id,
        employeeId: user.employee_id,
        name: user.full_name,
        category: user.category,
        attendance,
        totalPresent,
        totalLeave,
      }
    })
  }, [baseCodes, currentMonth, displayDays, draft, isEditing, records, users])

  const setCellCode = (userId: string, date: string, code: SheetCode) => {
    setDraft((prev) => ({ ...prev, [cellKey(userId, date)]: code }))
  }

  const cycleCellCode = (userId: string, date: string) => {
    const key = cellKey(userId, date)
    const current = draft[key] ?? ''
    const next = codeOptions[(codeOptions.indexOf(current) + 1) % codeOptions.length]
    setCellCode(userId, date, next)
  }

  const saveMonth = async () => {
    setIsSaving(true)
    try {
      const changedEntries = Object.entries(draft).filter(([key, code]) => (baseCodes[key] ?? '') !== code)

      for (const [key, code] of changedEntries) {
        const [userId, date] = key.split(':')
        const existing = latestRecordByCell.get(key)
        const status = codeToStatus(code)
        const payload = {
          user_id: userId,
          date,
          category: users?.find((user) => user.id === userId)?.category ?? 'Office',
          status,
          check_in_time: code === 'P' ? existing?.check_in_time ?? new Date(`${date}T09:30:00`).toISOString() : null,
          late_minutes: 0,
        }

        if (existing?.id) {
          const { error } = await client.from('attendance').update(payload).eq('id', existing.id)
          if (error) throw error
        } else if (code) {
          const { error } = await client.from('attendance').insert(payload)
          if (error) throw error
        }
      }

      toast.success('Monthly attendance saved')
      setIsEditing(false)
      await refetch()
    } catch (err: any) {
      toast.error('Failed to save attendance', err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const buildSheetRows = () => {
    const dayLabels = Array.from({ length: DISPLAY_DAY_COUNT }, (_, index) => String(index + 1))
    return [
      [`Svastha Attendance ${format(currentMonth, 'MMMM yyyy')}`, ...Array(dayLabels.length + 3).fill(''), 'P', 'L'],
      ['S.NO', 'E Code', 'NAME', ...dayLabels, 'No of Worked Days', 'No of Leave Days'],
      ...gridData.map((row) => [
        row.serial,
        row.employeeId || '-',
        row.name,
        ...dayLabels.map((day) => row.attendance[day] || ''),
        row.totalPresent,
        row.totalLeave,
      ]),
    ]
  }

  const exportMonthlyExcel = () => {
    if (gridData.length === 0) {
      toast.error('No attendance data to export')
      return
    }

    const worksheet = XLSX.utils.aoa_to_sheet(buildSheetRows())
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 + DISPLAY_DAY_COUNT } }]
    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 9 },
      { wch: 24 },
      ...Array.from({ length: DISPLAY_DAY_COUNT }, () => ({ wch: 4 })),
      { wch: 13 },
      { wch: 12 },
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, format(currentMonth, 'MMM yyyy'))
    XLSX.writeFile(workbook, `Svastha_Attendance_${format(currentMonth, 'MMMM_yyyy')}.xlsx`)
    toast.success('Attendance Excel exported')
  }

  const prevMonth = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() - 1)
    setCurrentMonth(d)
    setIsEditing(false)
  }

  const nextMonth = () => {
    const d = new Date(currentMonth)
    d.setMonth(d.getMonth() + 1)
    setCurrentMonth(d)
    setIsEditing(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-3 bg-card p-4 rounded-xl border border-border/50 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">Attendance Register</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={exportMonthlyExcel}>
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => { setDraft(baseCodes); setIsEditing(false) }} disabled={isSaving}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={saveMonth} loading={isSaving}>
                <Save className="h-4 w-4" />
                Save
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold min-w-[140px] text-center">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-[13px] text-black bg-white">
              <thead>
                <tr>
                  <th colSpan={3 + DISPLAY_DAY_COUNT} className="border border-slate-700 bg-white px-2 py-1 text-lg font-bold text-left">
                    Svastha Attendance {format(currentMonth, 'MMMM yyyy')}
                  </th>
                  <th className="border border-slate-700 bg-white px-2 py-1 text-center font-bold">P</th>
                  <th className="border border-slate-700 bg-white px-2 py-1 text-center font-bold">L</th>
                </tr>
                <tr className="bg-[#8faadc]">
                  <th className="border border-slate-700 px-1 py-1 align-bottom min-w-[38px]">S.NO</th>
                  <th className="border border-slate-700 px-1 py-1 align-bottom min-w-[48px]">E Code</th>
                  <th className="border border-slate-700 px-1 py-1 align-bottom min-w-[180px] text-left">NAME</th>
                  {displayDays.map((day, index) => {
                    const isValidMonthDay = isSameMonthDate(day, currentMonth)
                    const isOffDay = isValidMonthDay && isHighlightedOffDay(day)
                    return (
                      <th
                        key={index + 1}
                        className={`border border-slate-700 px-1 py-1 text-center align-bottom min-w-[32px] ${isOffDay ? 'bg-[#f4decd]' : ''}`}
                      >
                        {index + 1}
                      </th>
                    )
                  })}
                  <th className="border border-slate-700 px-2 py-1 text-center min-w-[84px]">No of<br />Worked<br />Days</th>
                  <th className="border border-slate-700 px-2 py-1 text-center min-w-[80px]">No of<br />Leave<br />Days</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5 + DISPLAY_DAY_COUNT} className="border border-slate-700 py-10 text-center text-slate-600">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : gridData.length === 0 ? (
                  <tr>
                    <td colSpan={5 + DISPLAY_DAY_COUNT} className="border border-slate-700 py-10 text-center text-slate-600">
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  gridData.map(row => (
                    <tr key={row.id}>
                      <td className="border border-slate-700 px-1 py-1 text-center">{row.serial}</td>
                      <td className="border border-slate-700 px-1 py-1 text-center">{row.employeeId}</td>
                      <td className="border border-slate-700 px-1 py-1 font-semibold text-left">{row.name}</td>
                      {displayDays.map((day, index) => {
                        const dayNumber = String(index + 1)
                        const isValidMonthDay = isSameMonthDate(day, currentMonth)
                        const date = isValidMonthDay ? format(day, 'yyyy-MM-dd') : ''
                        const code = row.attendance[dayNumber]
                        const isOffDay = isValidMonthDay && isHighlightedOffDay(day)
                        const isLeave = code === 'L'

                        return (
                          <td
                            key={dayNumber}
                            className={`border border-slate-700 p-0 text-center min-w-[32px] h-6 ${isOffDay ? 'bg-[#f4decd]' : ''} ${isLeave ? 'bg-[#ffc7d1]' : ''}`}
                          >
                            {isEditing && date ? (
                              <button
                                type="button"
                                className="h-6 w-full text-xs font-semibold hover:bg-blue-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                title="Click to change: blank, P, L"
                                onClick={() => cycleCellCode(row.id, date)}
                              >
                                {code}
                              </button>
                            ) : (
                              <span className="text-xs font-semibold">{code}</span>
                            )}
                          </td>
                        )
                      })}
                      <td className="border border-slate-700 px-2 py-1 text-center font-bold">{row.totalPresent}</td>
                      <td className="border border-slate-700 px-2 py-1 text-center font-bold">{row.totalLeave}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
