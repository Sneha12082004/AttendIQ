import React, { useEffect, useState } from 'react'
import { ScrollText, ShieldCheck, UserCheck } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { adminApi } from '../../api/admin'

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.getAuditLogs().then(setLogs).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security Audit Trail</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable event log for all biometric enrollments, geofence validations, and manual faculty overrides
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Audit Log</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor / User ID</th>
                <th className="px-4 py-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-sans">
                    No audit records recorded yet.
                  </td>
                </tr>
              ) : (
                logs.map((lg, idx) => (
                  <tr key={lg.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3 text-slate-400">
                      {lg.timestamp ? new Date(lg.timestamp).toLocaleString() : 'Recent'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60 font-sans">
                        {lg.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{lg.actor_id || lg.user_id || 'System'}</td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-md">
                      {JSON.stringify(lg.details || {})}
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
