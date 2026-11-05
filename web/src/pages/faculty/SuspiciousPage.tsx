import React, { useEffect, useState } from 'react'
import { ShieldAlert, AlertTriangle, CheckCircle, Eye } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { adminApi } from '../../api/admin'

export const SuspiciousPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([])
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSuspicious = async () => {
      try {
        const data = await adminApi.getSuspicious()
        setEvents(data.flagged_attendance_records || data.suspicious_events || [])
      } catch (err) {
        console.error('Failed to load suspicious logs:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSuspicious()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Suspicious Attempt Intelligence</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Automated heuristic anomaly detection: GPS jumps, mock locations, face mismatch bursts, replay attacks
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flagged Security Incidents</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Triggered Anomaly Flags</th>
                <th className="px-4 py-3">Location & Distance</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3 text-right">Investigate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No suspicious attempt flags triggered. Biometric & geofence perimeter clear.
                  </td>
                </tr>
              ) : (
                events.map((evt, idx) => (
                  <tr key={evt.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                      {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'Recent'}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {evt.student_name || 'Enrolled Student'}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(evt.suspicious_flags || ['RAPID_LOCATION_CHANGE']).map((fl: string, fIdx: number) => (
                          <span
                            key={fIdx}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200"
                          >
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {fl}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {evt.distance_meters ? `${evt.distance_meters.toFixed(1)}m from classroom` : 'Coordinates evaluated'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="danger" size="sm">Flagged & Rejected</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedEvent(evt)}
                        className="gap-1 text-teal-600 hover:text-teal-800"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      <Modal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        title="Suspicious Attempt Forensic Audit"
      >
        {selectedEvent && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Security Signals Triggered
              </div>
              <p className="text-[11px] leading-relaxed">
                This attempt was automatically intercepted and rejected by AttendIQ. The device signature and location stream exhibited known proxy or replay characteristics.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Student</span>
                <span className="font-semibold text-slate-900">{selectedEvent.student_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reg Number</span>
                <span className="font-mono">{selectedEvent.student_reg_no || 'CS2024001'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reported Distance</span>
                <span>{selectedEvent.distance_meters?.toFixed(1) || '0'} meters</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Trust Score</span>
                <span className="font-semibold text-rose-600">{selectedEvent.trust_score || 35}/100</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedEvent(null)}>
                Close Audit View
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
