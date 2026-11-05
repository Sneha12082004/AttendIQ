// Core user types
export interface User {
  id: string
  email: string
  role: 'faculty' | 'admin'
  full_name: string
  avatar_url?: string
  created_at: string
}

export interface Department {
  id: string
  name: string
  code: string
  head_faculty_id?: string
  created_at: string
}

export interface Faculty {
  id: string
  user_id: string
  employee_id: string
  full_name: string
  email: string
  department_id: string
  department_name?: string
  phone?: string
  designation: string
  is_active: boolean
  created_at: string
}

export interface Student {
  id: string
  enrollment_number: string
  full_name: string
  email: string
  department_id: string
  department_name?: string
  section: string
  semester: number
  phone?: string
  is_active: boolean
  face_registered: boolean
  created_at: string
}

export interface Classroom {
  id: string
  name: string
  building: string
  floor: number
  capacity: number
  latitude: number
  longitude: number
  geofence_radius: number
  ble_beacon_id?: string
  is_active: boolean
  created_at: string
}

export interface Subject {
  id: string
  name: string
  code: string
  department_id: string
  department_name?: string
  semester: number
  credits: number
}

export interface ClassSession {
  id: string
  faculty_id: string
  faculty_name?: string
  subject_id: string
  subject_name?: string
  subject_code?: string
  classroom_id: string
  classroom_name?: string
  section: string
  department_id: string
  start_time: string
  end_time?: string
  status: SessionStatus
  qr_token?: string
  qr_expires_at?: string
  total_students: number
  present_count: number
  absent_count: number
  pending_count: number
  created_at: string
}

export type SessionStatus = 'active' | 'closed' | 'cancelled'

export interface TrustScoreBreakdown {
  overall_score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  location_verified: boolean
  location_distance?: number
  face_match_score?: number
  liveness_verified?: boolean
  anti_spoof_verified?: boolean
  ble_verified?: boolean
  wifi_verified?: boolean
  timestamp_valid: boolean
  flags: string[]
}

export interface AttendanceRecord {
  id: string
  session_id: string
  student_id: string
  student_name?: string
  enrollment_number?: string
  status: AttendanceStatus
  trust_score?: number
  trust_grade?: 'A' | 'B' | 'C' | 'D' | 'F'
  trust_breakdown?: TrustScoreBreakdown
  verification_method: VerificationMethod
  rejection_reason?: string
  manual_override?: boolean
  override_reason?: string
  override_by?: string
  face_match_score?: number
  location_distance?: number
  flags: string[]
  marked_at: string
  created_at: string
}

export type AttendanceStatus = 'present' | 'absent' | 'pending' | 'rejected' | 'manual_override'
export type VerificationMethod = 'face' | 'ble' | 'manual' | 'qr' | 'hybrid'

export interface SuspiciousAttempt {
  id: string
  session_id: string
  session_info?: string
  student_id: string
  student_name?: string
  enrollment_number?: string
  flags: string[]
  face_match_score?: number
  location_distance?: number
  device_id?: string
  ip_address?: string
  rejection_reason?: string
  reviewed: boolean
  reviewed_by?: string
  review_note?: string
  created_at: string
}

export interface DashboardStats {
  total_students: number
  present_today: number
  absent_today: number
  pending_today: number
  attendance_percentage: number
  active_sessions: number
  total_sessions_today: number
  suspicious_count: number
}

export interface AdminDashboardStats {
  total_students: number
  total_faculty: number
  total_departments: number
  total_classrooms: number
  total_subjects: number
  today_attendance_percentage: number
  defaulters_count: number
  suspicious_today: number
  active_sessions: number
}

export interface LiveAttendanceFeed {
  records: AttendanceRecord[]
  session: ClassSession
  last_updated: string
}

export interface AuditLog {
  id: string
  user_id: string
  user_name?: string
  user_role?: string
  action: string
  resource_type: string
  resource_id?: string
  details?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

export interface Defaulter {
  student_id: string
  student_name: string
  enrollment_number: string
  department_name: string
  section: string
  attendance_percentage: number
  classes_attended: number
  total_classes: number
  classes_needed: number
}

export interface AttendanceReport {
  subject_id: string
  subject_name: string
  subject_code: string
  total_classes: number
  classes_attended: number
  attendance_percentage: number
  student_id?: string
  student_name?: string
}

export interface DailyAttendanceTrend {
  date: string
  present: number
  absent: number
  total: number
  percentage: number
}

export interface SubjectAttendance {
  subject_name: string
  subject_code: string
  attendance_percentage: number
  total_classes: number
  present: number
  absent: number
}

export interface SystemSettings {
  attendance_threshold: number
  geofence_default_radius: number
  demo_mode: boolean
  face_match_threshold: number
  trust_score_threshold: number
  session_qr_expiry_seconds: number
}

// API response wrapper
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface LoginCredentials {
  email: string
  password: string
  role: 'faculty' | 'admin'
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface CreateSessionPayload {
  subject_id: string
  classroom_id: string
  section: string
  department_id: string
  duration_minutes?: number
}

export interface ManualOverridePayload {
  attendance_record_id: string
  status: AttendanceStatus
  reason: string
}
