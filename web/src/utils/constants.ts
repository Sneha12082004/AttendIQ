export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const DEMO_CREDENTIALS = [
  {
    id: 'faculty-001',
    email: 'dr.sharma@attendiq.edu',
    password: 'faculty123',
    role: 'faculty' as const,
    name: 'Dr. Priya Sharma',
  },
  {
    id: 'faculty-002',
    email: 'prof.kumar@attendiq.edu',
    password: 'faculty123',
    role: 'faculty' as const,
    name: 'Prof. Rajesh Kumar',
  },
  {
    id: 'admin-001',
    email: 'admin@attendiq.edu',
    password: 'admin123',
    role: 'admin' as const,
    name: 'Admin User',
  },
]

export const REJECTION_REASON_LABELS: Record<string, string> = {
  face_mismatch: 'Face Mismatch',
  location_out_of_range: 'Out of Range',
  liveness_failed: 'Liveness Check Failed',
  anti_spoof_failed: 'Spoofing Detected',
  low_trust_score: 'Low Trust Score',
  session_expired: 'Session Expired',
  duplicate_attempt: 'Duplicate Attempt',
  device_mismatch: 'Device Mismatch',
}

export const FLAG_LABELS: Record<string, string> = {
  proxy_attempt: 'Proxy Attempt',
  location_spoof: 'Location Spoof',
  face_spoof: 'Face Spoof',
  multiple_attempts: 'Multiple Attempts',
  out_of_geofence: 'Out of Geofence',
  low_liveness: 'Low Liveness',
  suspicious_timing: 'Suspicious Timing',
  vpn_detected: 'VPN Detected',
}

export const TRUST_GRADE_COLORS: Record<string, string> = {
  A: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  B: 'text-teal-700 bg-teal-50 border-teal-200',
  C: 'text-amber-700 bg-amber-50 border-amber-200',
  D: 'text-orange-700 bg-orange-50 border-orange-200',
  F: 'text-red-700 bg-red-50 border-red-200',
}

export const STATUS_STYLES: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-600 border-red-200',
  manual_override: 'bg-purple-50 text-purple-700 border-purple-200',
}

export const NAV_ITEMS_FACULTY = [
  { path: '/faculty/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/faculty/sessions', label: 'Sessions', icon: 'CalendarCheck' },
  { path: '/faculty/reports', label: 'Reports', icon: 'BarChart3' },
  { path: '/faculty/suspicious', label: 'Suspicious', icon: 'AlertTriangle' },
]

export const NAV_ITEMS_ADMIN = [
  { section: 'Overview', items: [{ path: '/admin/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' }] },
  {
    section: 'Users',
    items: [
      { path: '/admin/students', label: 'Students', icon: 'Users' },
      { path: '/admin/faculty', label: 'Faculty', icon: 'GraduationCap' },
    ],
  },
  {
    section: 'Academic',
    items: [
      { path: '/admin/departments', label: 'Departments', icon: 'Building2' },
      { path: '/admin/classrooms', label: 'Classrooms', icon: 'DoorOpen' },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { path: '/admin/analytics', label: 'Analytics', icon: 'BarChart3' },
      { path: '/admin/defaulters', label: 'Defaulters', icon: 'UserX' },
      { path: '/admin/suspicious', label: 'Suspicious', icon: 'AlertTriangle' },
      { path: '/admin/audit-logs', label: 'Audit Logs', icon: 'ScrollText' },
    ],
  },
  { section: 'System', items: [{ path: '/admin/settings', label: 'Settings', icon: 'Settings' }] },
]
