import React, { useState, useEffect } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Play,
  Square,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { facultyApi } from '../../api/faculty'
import { sessionsApi } from '../../api/sessions'
import { attendanceApi } from '../../api/attendance'

export const FacultyDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<any>(null)
  const [liveAttendance, setLiveAttendance] = useState<any[]>([])
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<any>(null)
  const [overrideReason, setOverrideReason] = useState('')

  // Create form state
  const [subjectId, setSubjectId] = useState('subj-cs-01')
  const [classroomId, setClassroomId] = useState('room-101')
  const [duration, setDuration] = useState(60)

  const loadData = async () => {
    try {
      const data = await facultyApi.getDashboard()
      setDashboardData(data)
      setActiveSession(data.active_session)
      if (data.active_session) {
        const att = await sessionsApi.getSessionAttendance(data.active_session.id)
        setLiveAttendance(att)
      } else {
        setLiveAttendance(data.recent_attendance || [])
      }
    } catch (err) {
      console.error('Failed to load faculty dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Poll live feed every 5 seconds
    const interval = setInterval(() => {
      loadData()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const newSession = await sessionsApi.createSession({
        subject_id: subjectId,
        classroom_id: classroomId,
        section: 'A',
        duration_minutes: Number(duration),
      })
      setActiveSession(newSession)
      setShowCreateModal(false)
      loadData()
    } catch (err) {
      alert('Failed to create session')
    }
  }

  const handleCloseSession = async () => {
    if (!activeSession) return
    if (!confirm('Are you sure you want to end this attendance session?')) return
    try {
      await sessionsApi.closeSession(activeSession.id)
      setActiveSession(null)
      loadData()
    } catch (err) {
      alert('Failed to close session')
    }
  }

  const handleManualOverride = async () => {
    if (!selectedRecord || !overrideReason.trim()) return
    try {
      await attendanceApi.manualOverride({
        attendance_record_id: selectedRecord.id,
        new_status: 'present',
        reason: overrideReason,
      })
      setShowOverrideModal(false)
      setOverrideReason('')
      loadData()
    } catch (err) {
      alert('Override failed')
    }
  }

  const stats = dashboardData?.stats || {
    total_students: 45,
    present_today: 38,
    absent_today: 7,
    rejected_attempts: 2,
    suspicious_flagged: 1,
    attendance_rate: 84.4,
  }

  return (
    <div className="space-y-6">
      {/* Top Welcome Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Welcome back, {dashboardData?.faculty_name || 'Dr. Priya Mehta'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Department of Computer Science • Live Attendance Telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!activeSession ? (
            <Button
              variant="primary"
              size="md"
              onClick={() => setShowCreateModal(true)}
              className="gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Start Attendance Session
            </Button>
          ) : (
            <Button
              variant="danger"
              size="md"
              onClick={handleCloseSession}
              className="gap-2"
            >
              <Square className="w-4 h-4 fill-current" />
              Close Active Session
            </Button>
          )}
        </div>
      </div>

      {/* 4 Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-l-4 border-l-teal-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Enrolled Students</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total_students}</div>
          <p className="text-[11px] text-slate-400 mt-1">Section A & B Registered</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Verified Present</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{stats.present_today}</div>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {stats.attendance_rate}% Attendance Rate
          </p>
        </Card>

        <Card className="p-5 border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Rejected / Failed</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{stats.rejected_attempts}</div>
          <p className="text-[11px] text-slate-400 mt-1">Geofence or Biometric fail</p>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Suspicious Flagged</span>
            <ShieldAlert className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{stats.suspicious_flagged}</div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Anomalies Under Audit</p>
        </Card>
      </div>

      {/* Active Session Spotlight Banner */}
      {activeSession ? (
        <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-teal-500/30 overflow-hidden shadow-lg">
          <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Active Attendance Session
                </span>
                <span className="text-xs text-slate-400">• Nonce: {activeSession.session_nonce?.substring(0, 8)}...</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white">
                {activeSession.subject_name || 'Data Structures (CS301)'}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <span>📍 Classroom: {activeSession.classroom_name || 'Room 101'}</span>
                <span>📏 Geofence Radius: {activeSession.geofence_radius || 50}m</span>
                <span>⏱ Duration: {activeSession.scheduled_duration_minutes || 60} mins</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowQrModal(true)}
                className="gap-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold"
              >
                <QrCode className="w-4 h-4" />
                Project Classroom QR
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-6 bg-slate-50 border-dashed border-2 border-slate-300 text-center">
          <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700">No Active Attendance Session</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Start a new class session to begin receiving live student biometric and geofenced attendance.
          </p>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
            Start Session Now
          </Button>
        </Card>
      )}

      {/* Live Attendance Stream Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Live Attendance Stream</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time verification log with explainable Trust Score & audit signals
              </p>
            </div>
            <span className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {liveAttendance.length} records captured
            </span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-4 py-3">Location Signal</th>
                <th className="px-4 py-3">Biometrics</th>
                <th className="px-4 py-3">Liveness & PAD</th>
                <th className="px-4 py-3">Trust Score</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {liveAttendance.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 text-xs">
                    No attendance records captured yet for this session.
                  </td>
                </tr>
              ) : (
                liveAttendance.map((rec) => {
                  const isPresent = rec.status === 'present' || rec.status === 'manual_override'
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-slate-900">{rec.student_name}</div>
                        <div className="text-[11px] text-slate-400">{rec.student_reg_no}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        {rec.geofence_result ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            {rec.distance_meters ? `${rec.distance_meters.toFixed(1)}m` : 'Inside Geofence'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            <XCircle className="w-3 h-3" />
                            Outside ({rec.distance_meters ? `${rec.distance_meters.toFixed(1)}m` : 'Fail'})
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {rec.face_match_passed ? (
                          <span className="inline-flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Match ({((rec.face_match_score || 0.88) * 100).toFixed(0)}%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[11px]">
                            <XCircle className="w-3 h-3" />
                            Mismatch
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 space-y-0.5">
                        <div className="text-[11px] text-slate-700 flex items-center gap-1">
                          {rec.liveness_passed ? (
                            <span className="text-emerald-600">✓ Liveness Passed</span>
                          ) : (
                            <span className="text-rose-600">✗ Liveness Failed</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          PAD Anti-Spoof: {((rec.antispoof_score || 0.9) * 100).toFixed(0)}%
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            rec.trust_score >= 85 ? 'bg-emerald-600' :
                            rec.trust_score >= 70 ? 'bg-teal-600' :
                            rec.trust_score >= 55 ? 'bg-amber-500' : 'bg-rose-600'
                          }`}>
                            {rec.trust_grade || (rec.trust_score >= 85 ? 'A' : 'B')}
                          </span>
                          <span className="font-semibold text-slate-900">{rec.trust_score || 88}/100</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {rec.is_manual_override ? (
                          <Badge variant="purple" size="sm">Faculty Override</Badge>
                        ) : isPresent ? (
                          <Badge variant="success" size="sm">Present</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Rejected</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {!isPresent && (
                          <button
                            onClick={() => {
                              setSelectedRecord(rec)
                              setShowOverrideModal(true)
                            }}
                            className="text-xs text-teal-600 hover:text-teal-800 font-semibold hover:underline"
                          >
                            Override
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Start Session Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Start Attendance Session"
      >
        <form onSubmit={handleStartSession} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Select Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="subj-cs-01">CS301 — Data Structures</option>
              <option value="subj-cs-02">CS401 — Operating Systems</option>
              <option value="subj-cs-03">CS402 — Database Management</option>
              <option value="subj-cs-05">CS601 — Machine Learning</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Classroom & Geofence</label>
            <select
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
            >
              <option value="room-101">Room 101 — CS Block (Lat 19.0760, Lon 72.8777, 50m radius)</option>
              <option value="room-204">Room 204 — IT Block (Lat 19.0765, Lon 72.8782, 45m radius)</option>
              <option value="lab-ai">AI Innovation Lab — Floor 3 (Lat 19.0758, Lon 72.8770, 35m radius)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Session Duration (Minutes)</label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min={10}
              max={180}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Initialize Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Code Projector Modal */}
      <Modal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        title="Classroom Attendance QR Code"
        maxWidth="sm"
      >
        <div className="text-center space-y-4">
          <p className="text-xs text-slate-500">
            Project this code onto classroom screen. Students scan this QR code with AttendIQ mobile to bind their attendance attempt.
          </p>
          <div className="p-4 bg-white border border-slate-200 rounded-xl inline-block shadow-sm">
            {activeSession?.qr_code?.startsWith('data:image') ? (
              <img
                src={activeSession.qr_code}
                alt="Session QR"
                className="w-56 h-56 mx-auto"
              />
            ) : (
              <div className="w-56 h-56 flex flex-col items-center justify-center bg-slate-50 text-slate-400 text-xs p-4">
                <QrCode className="w-12 h-12 mb-2 text-slate-600" />
                <span className="font-mono text-[10px] break-all">
                  NONCE: {activeSession?.session_nonce}
                </span>
              </div>
            )}
          </div>
          <div className="text-[11px] text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
            🔐 Dynamically bound to Session #{activeSession?.id?.substring(0, 8)}
          </div>
        </div>
      </Modal>

      {/* Manual Override Modal */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Faculty Manual Attendance Override"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            You are manually verifying student <span className="font-semibold text-slate-900">{selectedRecord?.student_name}</span> ({selectedRecord?.student_reg_no}).
            This action requires a valid documented reason and will be permanently recorded in the audit log.
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Override Justification Reason *
            </label>
            <Input
              placeholder="e.g. Verified physically seated in front row; temporary indoor GPS drift"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleManualOverride} disabled={!overrideReason.trim()}>
              Confirm & Mark Present
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
