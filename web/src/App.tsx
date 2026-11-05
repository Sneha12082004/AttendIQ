import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { FacultyLayout } from './components/layout/FacultyLayout'
import { FacultyDashboard } from './pages/faculty/FacultyDashboard'
import { SessionsPage } from './pages/faculty/SessionsPage'
import { ReportsPage } from './pages/faculty/ReportsPage'
import { SuspiciousPage } from './pages/faculty/SuspiciousPage'

import { AdminLayout } from './components/layout/AdminLayout'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { ClassroomsPage } from './pages/admin/ClassroomsPage'
import { DefaultersPage } from './pages/admin/DefaultersPage'
import { AnalyticsPage } from './pages/admin/AnalyticsPage'
import { AuditLogsPage } from './pages/admin/AuditLogsPage'

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Faculty Routes */}
      <Route path="/faculty" element={<FacultyLayout />}>
        <Route index element={<Navigate to="/faculty/dashboard" replace />} />
        <Route path="dashboard" element={<FacultyDashboard />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="suspicious" element={<SuspiciousPage />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="classrooms" element={<ClassroomsPage />} />
        <Route path="defaulters" element={<DefaultersPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
