import { useState, useEffect } from 'react'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function AttendancePoliciesPage() {
  const { data: settings, isLoading } = useSettings()
  const { mutate: updateSettings, isPending } = useUpdateSettings()

  const [cutoff, setCutoff] = useState('09:30')
  const [logout, setLogout] = useState('18:00')
  const [days, setDays] = useState<string[]>([])

  useEffect(() => {
    if (settings) {
      setCutoff(settings.check_in_cutoff.slice(0, 5))
      setLogout(settings.auto_logout_time.slice(0, 5))
      setDays(settings.working_days || [])
    }
  }, [settings])

  const handleSave = () => {
    updateSettings({
      check_in_cutoff: `${cutoff}:00`,
      auto_logout_time: `${logout}:00`,
      working_days: days,
    })
  }

  const toggleDay = (day: string) => {
    setDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  if (isLoading) return <div className="text-muted-foreground">Loading policies...</div>

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Time Settings</CardTitle>
          <CardDescription>Configure check-in cutoff and auto-logout times.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="cutoff">Late Arrival Cutoff Time</Label>
              <Input
                id="cutoff"
                type="time"
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Check-ins after this time will be marked as Late.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="logout">Auto Logout Time</Label>
              <Input
                id="logout"
                type="time"
                value={logout}
                onChange={(e) => setLogout(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">System will auto check-out users at this time.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working Days</CardTitle>
          <CardDescription>Select the default working days for the company.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center space-x-2">
                <Checkbox
                  id={`day-${day}`}
                  checked={days.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                />
                <Label htmlFor={`day-${day}`}>{day}</Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={isPending}>
          Save Policy Changes
        </Button>
      </div>
    </div>
  )
}
