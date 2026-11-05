import React, { useEffect, useState } from 'react'
import { AlertTriangle, ShieldAlert, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { adminApi } from '../../api/admin'

export const DefaultersPage: React.FC = () => {
  const [defaulterData, setDefaulterData] = useState<any>(null)
  const [threshold, setThreshold] = useState(75)
  const [loading, setLoading] = useState(true)

  const loadDefaulters = async (t: number) => {
    try {
      const data = await adminApi.getDefaulters(t)
      setDefaulterData(data)
    } catch (err) {
      console.error('Failed to load defaulters:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDefaulters(threshold)
  }, [threshold])

  const defaulters = defaulterData?.defaulters || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Defaulter Early-Warning System
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Feature D: Automated identification of students below threshold with exact recovery class estimation
          </p>
        </div>

        {/* Threshold Selector */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 text-xs">
          <span className="text-slate-600 font-medium">Warning Threshold:</span>
          {[75, 80, 85].map((val) => (
            <button
              key={val}
              onClick={() => setThreshold(val)}
              className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                threshold === val
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {val}%
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>Identified At-Risk Students ({defaulters.length})</CardTitle>
            <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
              Threshold: &lt;{threshold}% Minimum Attendance
            </span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Student</th>
                <th className="px-4 py-3">Registration No</th>
                <th className="px-4 py-3">Current Attendance</th>
                <th className="px-4 py-3">Classes Attended</th>
                <th className="px-4 py-3">Defaulter Recovery Calculation</th>
                <th className="px-4 py-3">Risk Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {defaulters.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No students currently below the {threshold}% attendance threshold.
                  </td>
                </tr>
              ) : (
                defaulters.map((st: any) => (
                  <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{st.name}</td>
                    <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">{st.reg_number}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-rose-600">{st.attendance_percentage}%</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {st.classes_attended} / {st.classes_held} held
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-teal-800 bg-teal-50/80 px-2.5 py-1 rounded-lg border border-teal-200/60 inline-flex items-center gap-1.5 font-semibold">
                        <ArrowUpRight className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>Needs {st.classes_needed_to_recover} consecutive classes</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {st.risk_level === 'CRITICAL' ? (
                        <Badge variant="danger" size="sm">Critical (&lt;60%)</Badge>
                      ) : (
                        <Badge variant="warning" size="sm">Warning (&lt;75%)</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
