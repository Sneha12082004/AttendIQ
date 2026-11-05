import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { adminApi } from '../../api/admin'

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null)

  useEffect(() => {
    adminApi.getAnalytics().then(setAnalytics).catch(console.error)
  }, [])

  const weeklyData = analytics?.weekly_trend || [
    { day: 'Mon', rate: 88.5, sessions: 14 },
    { day: 'Tue', rate: 84.2, sessions: 16 },
    { day: 'Wed', rate: 91.0, sessions: 15 },
    { day: 'Thu', rate: 86.8, sessions: 18 },
    { day: 'Fri', rate: 79.4, sessions: 12 },
  ]

  const deptData = analytics?.department_stats || [
    { name: 'CS', attendance_rate: 88.5 },
    { name: 'IT', attendance_rate: 82.0 },
    { name: 'ECE', attendance_rate: 85.0 },
    { name: 'MECH', attendance_rate: 78.5 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Institutional Attendance Analytics</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Visual charts of campus trends, department comparisons, and weekly patterns
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Campus Attendance Percentage Trend (Daily)</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="rate" stroke="#0D9488" strokeWidth={2.5} fillOpacity={1} fill="url(#tealGrad)" name="Attendance %" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Department-Wise Performance Comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="attendance_rate" fill="#0F172A" radius={[6, 6, 0, 0]} name="Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
