import React, { useEffect, useState } from 'react'
import { Download, Filter, Search, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { facultyApi } from '../../api/faculty'

export const ReportsPage: React.FC = () => {
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await facultyApi.getReports()
        setReportData(data)
      } catch (err) {
        console.error('Failed to load reports:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  const handleExportCsv = () => {
    window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/faculty/reports/export-csv`, '_blank')
  }

  const students = (reportData?.students || []).filter((s: any) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.reg_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Attendance Reports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Subject-wise breakdown, aggregate attendance rates, and Trust Score averages
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
          <Download className="w-4 h-4" />
          Export Audit CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <CardTitle>Enrolled Students Attendance Roster</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or reg number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Student Name</th>
                <th className="px-4 py-3">Registration No</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Classes Attended</th>
                <th className="px-4 py-3">Attendance %</th>
                <th className="px-4 py-3">Avg Trust Score</th>
                <th className="px-4 py-3">Risk Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                students.map((st: any) => (
                  <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">{st.name}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">{st.reg_number}</td>
                    <td className="px-4 py-3.5">{st.section}</td>
                    <td className="px-4 py-3.5">{st.attended} / {st.total_sessions}</td>
                    <td className="px-4 py-3.5 font-bold">
                      <span className={st.percentage >= 75 ? 'text-emerald-700' : 'text-rose-600'}>
                        {st.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-teal-700 font-semibold">{st.average_trust_score}/100</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {st.percentage >= 75 ? (
                        <Badge variant="success" size="sm">Good Standing</Badge>
                      ) : (
                        <Badge variant="danger" size="sm">Defaulter Risk (&lt;75%)</Badge>
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
