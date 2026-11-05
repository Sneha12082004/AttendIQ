import React, { useEffect, useState } from 'react'
import { Calendar, Users, Clock, CheckCircle2, QrCode } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { facultyApi } from '../../api/faculty'

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await facultyApi.getSessions()
        setSessions(data)
      } catch (err) {
        console.error('Failed to fetch faculty sessions:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Class Sessions History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history of all scheduled and active attendance sessions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((sess) => (
          <Card key={sess.id} className="hover:border-teal-500/50 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/50">
                  {sess.subject_code || 'CS301'}
                </span>
                {sess.is_active ? (
                  <Badge variant="success" size="sm">Active Now</Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Closed</Badge>
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{sess.subject_name || 'Subject'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Classroom: {sess.classroom_name || 'Room 101'}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sess.present_count || 0} Attended</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{sess.scheduled_duration_minutes || 60}m duration</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
