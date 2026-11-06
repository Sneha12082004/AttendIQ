import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Smartphone,
  MapPin,
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Sliders,
  ChevronLeft,
  RotateCcw,
  Radio,
  User,
  Upload,
  Check,
  VideoOff,
  Video,
  Eye,
  Info
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

interface EnrolledProfile {
  id: string
  name: string
  reg: string
  email: string
  folder: string
}

const ENROLLED_STUDENTS: Record<string, EnrolledProfile> = {
  'stu-001': {
    id: 'stu-001',
    name: 'Sneha Banerjee',
    reg: 'CS2024001',
    email: 'student1@attendiq.demo',
    folder: 'Sneha_Banerjee',
  },
  'stu-002': {
    id: 'stu-002',
    name: 'Aastha Singh',
    reg: 'CS2024002',
    email: 'student2@attendiq.demo',
    folder: 'Aastha_Singh',
  },
}

export const StudentAppPage: React.FC = () => {
  const navigate = useNavigate()

  // ── Enrolled Identity Selection ───────────────────────────────────────────
  const [selectedStudentId, setSelectedStudentId] = useState<string>('stu-001')
  const activeProfile = ENROLLED_STUDENTS[selectedStudentId]

  // ── Session & Auth State ──────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<any>(null)
  const [studentToken, setStudentToken] = useState<string | null>(null)
  const [step, setStep] = useState<
    'idle' | 'geofence' | 'camera' | 'challenge' | 'verifying' | 'success' | 'failed'
  >('idle')

  // ── Camera & Real-Time OpenCV Recognition State ───────────────────────────
  const [cameraActive, setCameraActive] = useState<boolean>(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [detectedFaces, setDetectedFaces] = useState<any[]>([])
  const [recognitionLabel, setRecognitionLabel] = useState<string>('Camera standby')
  const [recognitionColor, setRecognitionColor] = useState<string>('slate')
  const [liveSimilarity, setLiveSimilarity] = useState<number>(0)
  const [isProcessingFrame, setIsProcessingFrame] = useState<boolean>(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameIntervalRef = useRef<any>(null)

  // ── Active Liveness State ─────────────────────────────────────────────────
  const [challengeData, setChallengeData] = useState<any>(null)
  const [countdown, setCountdown] = useState<number>(10)
  const [livenessStatus, setLivenessStatus] = useState<string>('Awaiting action')

  // ── BLE Simulator State ───────────────────────────────────────────────────
  const [bleState, setBleState] = useState<'near' | 'nearby' | 'weak' | 'disconnected'>('near')
  const [bleRssi, setBleRssi] = useState<number>(-45)

  // ── GPS Geofence State ────────────────────────────────────────────────────
  const [geofenceOverride, setGeofenceOverride] = useState<boolean>(true)
  const [realGps, setRealGps] = useState<{ lat: number; lon: number; accuracy: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState<boolean>(false)

  // ── Attack / Testbench Simulators ─────────────────────────────────────────
  const [simulateSpoof, setSimulateSpoof] = useState<boolean>(false)
  const [resultData, setResultData] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [enrolledRoster, setEnrolledRoster] = useState<any[]>([])
  const [syncStatus, setSyncStatus] = useState<string | null>(null)

  // 1. Authenticate selected student & load active session
  const authenticateStudent = useCallback(async (studentId: string) => {
    const profile = ENROLLED_STUDENTS[studentId]
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: profile.email,
        password: 'Demo@123',
      })
      const token = loginRes.data.access_token
      setStudentToken(token)

      // Fetch active sessions
      const sessRes = await axios.get(`${API_BASE}/sessions/active`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const list = sessRes.data || []
      if (list.length > 0) {
        setActiveSession(list[0])
      } else {
        setActiveSession({
          id: 'sess-001',
          subject_name: 'Data Structures & Algorithms',
          subject_code: 'CS301',
          classroom_name: 'Room 101 (CS Dept)',
          classroom_lat: 22.5726,
          classroom_lon: 88.3639,
          geofence_radius: 50.0,
          faculty_name: 'Dr. Priya Mehta',
          ble_beacon_id: 'ATTENDIQ-CLASSROOM-01',
        })
      }
    } catch (err: any) {
      console.warn('Student auth fallback:', err)
      setActiveSession({
        id: 'sess-001',
        subject_name: 'Data Structures & Algorithms',
        subject_code: 'CS301',
        classroom_name: 'Room 101 (CS Dept)',
        classroom_lat: 22.5726,
        classroom_lon: 88.3639,
        geofence_radius: 50.0,
        faculty_name: 'Dr. Priya Mehta',
        ble_beacon_id: 'ATTENDIQ-CLASSROOM-01',
      })
    }
  }, [])

  // Load roster info
  const loadRoster = async () => {
    try {
      const res = await axios.get(`${API_BASE}/enrollment/roster`)
      setEnrolledRoster(res.data.enrolled_students || [])
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    authenticateStudent(selectedStudentId)
    loadRoster()
  }, [selectedStudentId, authenticateStudent])

  // 2. Simulated BLE RSSI dynamic fluctuations
  useEffect(() => {
    const interval = setInterval(() => {
      const jitter = Math.floor(Math.random() * 5) - 2
      let base = -45
      if (bleState === 'nearby') base = -60
      if (bleState === 'weak') base = -76
      if (bleState === 'disconnected') base = -95
      setBleRssi(base + jitter)
    }, 1500)
    return () => clearInterval(interval)
  }, [bleState])

  // 3. Start Camera Function
  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err: any) {
      console.error('Camera access error:', err)
      setCameraActive(false)
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser site settings.'
          : 'MacBook camera not found or already in use by another application.'
      )
    }
  }

  // 4. Stop Camera Function
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setCameraActive(false)
    setDetectedFaces([])
    setRecognitionLabel('Camera stopped')
  }

  // Manage camera on step change
  useEffect(() => {
    if (step === 'camera' || step === 'challenge') {
      startCamera()
    }
    return () => {
      if (step === 'idle' || step === 'success' || step === 'failed') {
        stopCamera()
      }
    }
  }, [step])

  // 5. Draw OpenCV bounding box on overlay canvas
  const drawOverlay = (
    faces: any[],
    vidW: number,
    vidH: number,
    canvas: HTMLCanvasElement
  ) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    faces.forEach((face) => {
      const { bbox, color, name, similarity } = face
      if (!bbox) return

      // Scale coords from video natural dimension to canvas display
      const scaleX = canvas.width / vidW
      const scaleY = canvas.height / vidH

      const x = bbox.x * scaleX
      const y = bbox.y * scaleY
      const w = bbox.w * scaleX
      const h = bbox.h * scaleY

      // Box styling based on OpenCV classification
      let strokeColor = '#f59e0b' // Amber for UNKNOWN PERSON
      let fillColor = 'rgba(245, 158, 11, 0.15)'
      if (color === 'green') {
        strokeColor = '#10b981' // Green for Sneha Banerjee / Aastha Singh
        fillColor = 'rgba(16, 185, 129, 0.18)'
      } else if (color === 'red') {
        strokeColor = '#ef4444' // Red for Spoof / Multiple Faces
        fillColor = 'rgba(239, 68, 68, 0.20)'
      }

      // 1. Bounding Box Rectangle
      ctx.lineWidth = 3
      ctx.strokeStyle = strokeColor
      ctx.fillStyle = fillColor
      ctx.strokeRect(x, y, w, h)
      ctx.fillRect(x, y, w, h)

      // 2. Corner Crosshairs (OpenCV tech visual)
      const cLen = 14
      ctx.lineWidth = 4
      // Top-Left
      ctx.beginPath()
      ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y); ctx.stroke()
      // Top-Right
      ctx.beginPath()
      ctx.moveTo(x + w - cLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cLen); ctx.stroke()
      // Bottom-Left
      ctx.beginPath()
      ctx.moveTo(x, y + h - cLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cLen, y + h); ctx.stroke()
      // Bottom-Right
      ctx.beginPath()
      ctx.moveTo(x + w - cLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cLen); ctx.stroke()

      // 3. Label Badge Header
      const labelText = `${name} (${(similarity * 100).toFixed(1)}%)`
      ctx.font = 'bold 11px ui-monospace, SFMono-Regular, Menlo, monospace'
      const textMetrics = ctx.measureText(labelText)
      const pad = 6
      const badgeW = textMetrics.width + pad * 2
      const badgeH = 20

      ctx.fillStyle = strokeColor
      ctx.fillRect(x, Math.max(0, y - badgeH), badgeW, badgeH)

      ctx.fillStyle = '#0f172a'
      ctx.fillText(labelText, x + pad, Math.max(14, y - 5))
    })
  }

  // 6. Real-time frame capture & OpenCV backend recognition polling
  const processLiveFrame = useCallback(async () => {
    if (!videoRef.current || !cameraActive || isProcessingFrame) return
    const video = videoRef.current
    if (video.readyState < 2 || video.videoWidth === 0) return

    setIsProcessingFrame(true)
    try {
      const offCanvas = document.createElement('canvas')
      offCanvas.width = 480
      offCanvas.height = 360
      const offCtx = offCanvas.getContext('2d')
      if (!offCtx) return

      offCtx.drawImage(video, 0, 0, 480, 360)

      // If simulateSpoof is toggled on, overlay high-intensity specular glare ring
      if (simulateSpoof) {
        offCtx.fillStyle = '#ffffff'
        offCtx.beginPath()
        offCtx.arc(240, 180, 55, 0, Math.PI * 2)
        offCtx.fill()
      }

      const frameB64 = offCanvas.toDataURL('image/jpeg', 0.8)

      // Send to Backend OpenCV Face Pipeline (open matching across Sneha and Aastha)
      const res = await axios.post(`${API_BASE}/attendance/recognize-frame`, {
        frame_b64: frameB64,
        expected_student_id: null,
      })

      const data = res.data
      const faces = data.faces || []
      setDetectedFaces(faces)

      if (canvasRef.current) {
        canvasRef.current.width = video.clientWidth
        canvasRef.current.height = video.clientHeight
        drawOverlay(faces, 480, 360, canvasRef.current)
      }

      if (faces.length > 0) {
        const topFace = faces[0]
        setRecognitionLabel(topFace.name)
        setRecognitionColor(topFace.color)
        setLiveSimilarity(topFace.similarity)
      } else {
        setRecognitionLabel(data.message || 'Position face in frame')
        setRecognitionColor('slate')
        setLiveSimilarity(0)
      }
    } catch (err) {
      console.warn('Frame recognition error:', err)
    } finally {
      setIsProcessingFrame(false)
    }
  }, [cameraActive, isProcessingFrame, selectedStudentId, simulateSpoof])

  // Poll video frames at 3.5 fps
  useEffect(() => {
    if (cameraActive && (step === 'camera' || step === 'challenge')) {
      frameIntervalRef.current = setInterval(processLiveFrame, 320)
    } else {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
    }
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
    }
  }, [cameraActive, step, processLiveFrame])

  // 7. Active Liveness Countdown
  useEffect(() => {
    let timer: any = null
    if (step === 'challenge' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000)
    } else if (step === 'challenge' && countdown === 0) {
      handleSubmitAttendance()
    }
    return () => clearInterval(timer)
  }, [step, countdown])

  // 8. Real MacBook GPS Acquisition
  const acquireRealGps = () => {
    setIsLocating(true)
    setGpsError(null)
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by this browser.')
      setIsLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setRealGps({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setIsLocating(false)
      },
      (err) => {
        console.warn('GPS location error:', err)
        setGpsError(err.message || 'Unable to retrieve MacBook location')
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // 9. Sync Enrollment Photos from Disk
  const handleSyncPhotos = async () => {
    setSyncStatus('Syncing photos from enrollment_photos/...')
    try {
      const res = await axios.post(`${API_BASE}/enrollment/sync-photos`)
      setSyncStatus('Photos synced successfully!')
      setEnrolledRoster(res.data.roster || [])
      setTimeout(() => setSyncStatus(null), 3500)
    } catch (err: any) {
      setSyncStatus('Sync failed: ' + (err.response?.data?.detail || err.message))
    }
  }

  // 10. Handle Photo Upload for Selected Student
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async () => {
      const b64 = reader.result as string
      try {
        setSyncStatus(`Uploading enrollment photo for ${activeProfile.name}...`)
        const res = await axios.post(`${API_BASE}/enrollment/upload-photo`, {
          student_id: selectedStudentId,
          photo_base64: b64,
          file_name: file.name,
        })
        setSyncStatus(`Photo saved for ${activeProfile.name}!`)
        setEnrolledRoster(res.data.roster || [])
        setTimeout(() => setSyncStatus(null), 3500)
      } catch (err: any) {
        setSyncStatus('Upload failed: ' + (err.response?.data?.detail || err.message))
      }
    }
    reader.readAsDataURL(file)
  }

  // 10b. Quick Enroll from Live Webcam
  const handleQuickWebcamEnroll = async () => {
    if (!videoRef.current || !cameraActive) {
      // Auto-start camera if not already active
      await startCamera()
      setSyncStatus('Camera starting... Look directly into camera and click again to capture.')
      return
    }
    try {
      const offCanvas = document.createElement('canvas')
      offCanvas.width = 480
      offCanvas.height = 360
      const offCtx = offCanvas.getContext('2d')
      if (!offCtx) return
      offCtx.drawImage(videoRef.current, 0, 0, 480, 360)
      const frameB64 = offCanvas.toDataURL('image/jpeg', 0.9)

      setSyncStatus(`Enrolling face from live webcam for ${activeProfile.name}...`)
      const res = await axios.post(`${API_BASE}/enrollment/quick-webcam-enroll`, {
        student_id: selectedStudentId,
        frame_b64: frameB64,
      })
      setSyncStatus(`✅ Successfully enrolled ${activeProfile.name} from live webcam!`)
      setEnrolledRoster(res.data.roster || [])
      setTimeout(() => setSyncStatus(null), 4000)
    } catch (err: any) {
      setSyncStatus('Enrollment failed: ' + (err.response?.data?.detail || err.message))
    }
  }

  // 11. Start Attendance Flow
  const handleStartAttendance = async () => {
    setStep('geofence')
    setResultData(null)

    setTimeout(async () => {
      // Check Geofence
      if (!geofenceOverride) {
        setStep('failed')
        setResultData({
          status: 'rejected',
          rejection_reasons: ['Outside classroom geofence boundary (84.5m > 50m radius)'],
          trust_score: { overall_score: 22.0, grade: 'F' },
        })
        return
      }

      setStep('camera')

      // Request fresh Active Liveness Challenge
      const sessionId = activeSession?.id || 'sess-001'
      let currentChal = null

      try {
        const token = studentToken || localStorage.getItem('attendiq_student_token')
        const chalRes = await axios.post(
          `${API_BASE}/attendance/challenge`,
          { session_id: sessionId },
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        )
        currentChal = chalRes.data
        setChallengeData(currentChal)
        setLivenessStatus(`Perform challenge: ${currentChal.instruction}`)
      } catch (err: any) {
        console.warn('Challenge fallback:', err)
        currentChal = {
          challenge_id: `chal-${Date.now().toString(16)}`,
          challenge_type: 'blink',
          instruction: 'Blink your eyes twice naturally in front of camera',
          nonce: 'nonce-live-01',
        }
        setChallengeData(currentChal)
        setLivenessStatus('Blink your eyes twice naturally in front of camera')
      }

      setTimeout(() => {
        setStep('challenge')
        setCountdown(10)
      }, 1500)
    }, 1200)
  }

  // 12. Submit Verified Attendance Payload
  const handleSubmitAttendance = async () => {
    setStep('verifying')

    // Grab current camera snapshot
    let snapshotB64 = ''
    if (videoRef.current && cameraActive) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 480
        canvas.height = 360
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 480, 360)
          if (simulateSpoof) {
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(240, 180, 55, 0, Math.PI * 2)
            ctx.fill()
          }
          snapshotB64 = canvas.toDataURL('image/jpeg', 0.85)
        }
      } catch {
        // fallback
      }
    }

    const classroomLat = activeSession?.classroom_lat || 22.5726
    const classroomLon = activeSession?.classroom_lon || 88.3639

    // Coordinates: within geofence or outside based on test toggle
    const subLat = geofenceOverride ? classroomLat + 0.00008 : classroomLat + 0.0015
    const subLon = geofenceOverride ? classroomLon + 0.00005 : classroomLon + 0.0018

    const payload: any = {
      session_id: activeSession?.id || 'sess-001',
      challenge_id: challengeData?.challenge_id || 'chal-demo-01',
      challenge_nonce: challengeData?.nonce || 'nonce-demo-01',
      latitude: subLat,
      longitude: subLon,
      accuracy: realGps?.accuracy || 5.0,
      ble_beacon_id: bleState !== 'disconnected' ? 'ATTENDIQ-CLASSROOM-01' : null,
      face_image_base64: snapshotB64,
      is_mock_location: false,
      device_id: 'macbook-web-simulator',
    }

    try {
      const token = studentToken || localStorage.getItem('attendiq_student_token')
      const markRes = await axios.post(`${API_BASE}/attendance/mark`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      const data = markRes.data
      setResultData(data)
      setStep(data.status === 'present' ? 'success' : 'failed')

      if (data.status === 'present') {
        setHistory((prev) => [
          {
            id: data.record_id,
            student: activeProfile.name,
            subject: activeSession?.subject_name || 'Data Structures (CS301)',
            time: 'Just now',
            status: 'Present',
            score: data.trust_score?.overall_score || 91.5,
            grade: data.trust_score?.grade || 'A',
          },
          ...prev,
        ])
      }
    } catch (err: any) {
      const errDetail = err.response?.data?.detail || 'Biometric security threshold not satisfied'
      setResultData({
        status: 'rejected',
        rejection_reasons: [errDetail],
        trust_score: { overall_score: 35.0, grade: 'F' },
      })
      setStep('failed')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 text-slate-100 font-sans">
      {/* Top Bar */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-4 px-2">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Return to Login / Role Switcher
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2.5 py-0.5 rounded-full font-mono font-medium">
            CIH-001: Biometric & Simulated BLE Attendance
          </span>
          <span className="text-[11px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
            MacBook Webcam Active
          </span>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Evaluation Testbench Controls for Judges */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 order-2 lg:order-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-400">
              <Sliders className="w-4 h-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Evaluation Testbench</h3>
            </div>
            <button
              onClick={() => {
                setStep('idle')
                stopCamera()
              }}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Demo
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Configure live inputs for the biometric demonstration on your MacBook. All facial verification
            runs live OpenCV feature extraction against the registered student templates.
          </p>

          {/* 1. Student Identity Switcher */}
          <div className="space-y-2 p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-teal-400" />
                Active Student Identity (Enrollment Roster):
              </span>
              <span className="text-[10px] text-teal-300 font-mono">2 Registered</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(ENROLLED_STUDENTS).map((stu) => {
                const isSelected = selectedStudentId === stu.id
                return (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => setSelectedStudentId(stu.id)}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500/70 text-white shadow-sm'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs">{stu.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{stu.reg}</div>
                  </button>
                )
              })}
            </div>

            {/* Photo Ingestion, Webcam Capture & Sync Controls */}
            <div className="pt-2 border-t border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <label className="cursor-pointer px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md flex items-center gap-1 transition-colors">
                  <Upload className="w-3 h-3 text-teal-400" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSyncPhotos}
                  className="px-2 py-1 text-teal-400 hover:text-teal-300 flex items-center gap-1 text-[11px]"
                  title="Scan backend/enrollment_photos folder"
                >
                  <RefreshCw className="w-3 h-3" /> Sync Photos
                </button>
              </div>

              {/* 1-Click Webcam Enrollment Button */}
              <button
                type="button"
                onClick={handleQuickWebcamEnroll}
                className="w-full py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                <Camera className="w-3.5 h-3.5" />
                Enroll Face from Live Webcam for {activeProfile.name}
              </button>
            </div>
            {syncStatus && (
              <div className="text-[10px] text-teal-300 bg-teal-500/10 p-2 rounded border border-teal-500/30 font-medium">
                {syncStatus}
              </div>
            )}
          </div>

          {/* 2. Simulated BLE Beacon Panel */}
          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                Classroom BLE Beacon:
              </span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                SIMULATED BLE — NO PHYSICAL BEACON CONNECTED
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
              <div>
                <span className="text-slate-400 text-[11px]">Beacon ID: </span>
                <span className="font-mono text-teal-300 font-semibold">ATTENDIQ-CLASSROOM-01</span>
              </div>
              <div className="font-mono font-bold text-indigo-300">
                RSSI: {bleRssi} dBm
              </div>
            </div>

            {/* RSSI Distance State Toggles */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { id: 'near', label: 'Near (-45dB)', val: 'near' },
                { id: 'nearby', label: 'Nearby (-60dB)', val: 'nearby' },
                { id: 'weak', label: 'Weak (-75dB)', val: 'weak' },
                { id: 'disconnected', label: 'Disconnected', val: 'disconnected' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setBleState(btn.val as any)}
                  className={`py-1.5 px-1 rounded text-[10px] font-medium border text-center transition-colors ${
                    bleState === btn.val
                      ? 'bg-indigo-600/30 text-indigo-200 border-indigo-500/70 font-bold'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. GPS Geofence & Real MacBook Coordinates */}
          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                GPS Geofence Perimeter:
              </span>
              <button
                type="button"
                onClick={acquireRealGps}
                disabled={isLocating}
                className="text-[10px] bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 px-2 py-0.5 rounded border border-teal-500/40 flex items-center gap-1"
              >
                {isLocating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <MapPin className="w-3 h-3" />}
                Acquire Real MacBook GPS
              </button>
            </div>

            {realGps && (
              <div className="text-[10px] font-mono text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800 space-y-0.5">
                <div>Lat: {realGps.lat.toFixed(5)}, Lon: {realGps.lon.toFixed(5)}</div>
                <div className="text-teal-400">Accuracy: ±{realGps.accuracy.toFixed(1)}m (MacBook Geolocation API)</div>
              </div>
            )}
            {gpsError && (
              <div className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/30">
                {gpsError}
              </div>
            )}

            {/* Testbench Geofence Pass/Fail Toggle */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setGeofenceOverride(true)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  geofenceOverride
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Inside Room (12.4m)
              </button>
              <button
                type="button"
                onClick={() => setGeofenceOverride(false)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  !geofenceOverride
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Outside Boundary (84.5m)
              </button>
            </div>
          </div>

          {/* 4. Anti-Spoofing & Attack Simulation */}
          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Anti-Spoofing Test Mode:
              </span>
              <span className={!simulateSpoof ? 'text-[11px] text-teal-400 font-mono' : 'text-[11px] text-amber-400 font-mono'}>
                {!simulateSpoof ? 'Genuine Student Face' : 'Screen Glare / Spoof Attack'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSimulateSpoof(false)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  !simulateSpoof
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Live Human
              </button>
              <button
                type="button"
                onClick={() => setSimulateSpoof(true)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  simulateSpoof
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                Simulate Replay / Photo
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Smartphone Screen Frame (Simulator) */}
        <div className="lg:col-span-6 flex justify-center order-1 lg:order-2">
          <div className="relative w-[340px] h-[700px] bg-slate-900 border-[8px] border-slate-800 rounded-[44px] shadow-2xl shadow-teal-500/10 flex flex-col overflow-hidden">
            {/* Notch */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-950 rounded-full z-30 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-800 rounded-full" />
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ml-3" />
            </div>

            {/* Status Bar */}
            <div className="h-10 px-6 pt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400 z-20">
              <span>9:41</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">5G</span>
                <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5">
                  <div className="w-full h-full bg-teal-400 rounded-2xs" />
                </div>
              </div>
            </div>

            {/* App Header */}
            <div className="px-5 py-3 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between z-10">
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  AttendIQ Student
                </h1>
                <p className="text-[10px] text-teal-300 font-mono">
                  {activeProfile.name} ({activeProfile.reg})
                </p>
              </div>
              <button
                onClick={() => {
                  setStep('idle')
                  stopCamera()
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                title="Reset simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile App Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Active Session Card */}
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700/60 rounded-2xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md font-mono">
                    {activeSession?.subject_code || 'CS301'}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Session Active
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white leading-snug">
                    {activeSession?.subject_name || 'Data Structures & Algorithms'}
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    {activeSession?.faculty_name || 'Dr. Priya Mehta'} • {activeSession?.classroom_name || 'Room 101'}
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3 h-3 text-teal-400" />
                    {geofenceOverride ? '12.4m away' : '84.5m away'}
                  </span>
                  <span className={geofenceOverride ? 'text-teal-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {geofenceOverride ? 'Inside Geofence' : 'Outside Perimeter'}
                  </span>
                </div>
              </div>

              {/* State 1: Idle Action Card */}
              {step === 'idle' && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Biometric Verification Ready</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      MacBook webcam face recognition with OpenCV bounding box & liveness
                    </p>
                  </div>
                  <button
                    onClick={handleStartAttendance}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-teal-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    Mark Attendance
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* State 2: Geofence Verification */}
              {step === 'geofence' && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-teal-500/30 animate-ping" />
                    <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-teal-400">
                      <MapPin className="w-7 h-7" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Verifying Geofence & BLE</h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Checking classroom proximity ({geofenceOverride ? '12.4m' : '84.5m'}) and beacon RSSI ({bleRssi} dBm)...
                    </p>
                  </div>
                </div>
              )}

              {/* State 3: Live MacBook Camera & Real-Time OpenCV Bounding Box */}
              {(step === 'camera' || step === 'challenge') && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 space-y-2.5">
                  {/* Camera Viewport with Overlaid Canvas */}
                  <div className="relative w-full h-52 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
                    {/* Real MacBook Webcam Video Stream */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    />

                    {/* Dynamic OpenCV Bounding Box Overlay */}
                    <canvas
                      ref={canvasRef}
                      className={`absolute inset-0 w-full h-full pointer-events-none ${
                        cameraActive ? 'block' : 'hidden'
                      }`}
                    />

                    {/* Camera Error / Standby */}
                    {!cameraActive && (
                      <div className="text-center p-3">
                        <VideoOff className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                        <p className="text-[11px] text-slate-300 font-semibold">Webcam Not Running</p>
                        {cameraError ? (
                          <p className="text-[10px] text-rose-400 mt-1 px-2">{cameraError}</p>
                        ) : (
                          <p className="text-[10px] text-slate-500 mt-1">Click Start Camera to begin stream</p>
                        )}
                        <button
                          onClick={startCamera}
                          className="mt-2 px-3 py-1 bg-teal-600 text-white rounded text-[10px] font-bold"
                        >
                          Start Camera
                        </button>
                      </div>
                    )}

                    {/* Live Classification Banner */}
                    {cameraActive && (
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                        <div
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 shadow backdrop-blur ${
                            recognitionColor === 'green'
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                              : recognitionColor === 'red'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-500/50'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              recognitionColor === 'green'
                                ? 'bg-emerald-400'
                                : recognitionColor === 'red'
                                ? 'bg-rose-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          {recognitionLabel}
                        </div>

                        {step === 'challenge' && (
                          <div className="bg-slate-900/90 text-teal-300 px-2 py-0.5 rounded-full text-[10px] font-mono border border-teal-500/40">
                            {countdown}s
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Camera Controls (Start/Stop) */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-slate-400">
                      <span className="font-semibold text-slate-300">Similarity:</span>
                      <span
                        className={`font-mono font-bold ${
                          liveSimilarity >= 0.40 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {(liveSimilarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    {cameraActive ? (
                      <button
                        onClick={stopCamera}
                        className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-medium flex items-center gap-1"
                      >
                        <VideoOff className="w-3 h-3" /> Stop Camera
                      </button>
                    ) : (
                      <button
                        onClick={startCamera}
                        className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded text-[10px] font-medium flex items-center gap-1"
                      >
                        <Video className="w-3 h-3" /> Start Camera
                      </button>
                    )}
                  </div>

                  {/* Randomized Challenge Box */}
                  <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-2.5 text-center space-y-1">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-teal-400">
                      Active Liveness Challenge
                    </span>
                    <p className="text-xs font-semibold text-white">
                      {challengeData?.instruction || 'Blink your eyes twice naturally in front of camera'}
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitAttendance}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    Confirm Biometric Attendance
                  </button>
                </div>
              )}

              {/* State 4: Verifying */}
              {step === 'verifying' && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
                  <div>
                    <h3 className="text-xs font-bold text-white">Authenticating Multi-Layer Biometrics</h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Validating facial embeddings for {activeProfile.name}, active challenge nonce, and anti-spoof PAD...
                    </p>
                  </div>
                </div>
              )}

              {/* State 5: Success */}
              {step === 'success' && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300">Attendance Marked Present</h3>
                    <p className="text-[11px] text-emerald-400/80 font-mono mt-0.5">
                      {activeProfile.name} • {resultData?.record_id || 'att-verified-01'}
                    </p>
                  </div>

                  {/* Trust Score Breakdown */}
                  <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between text-left">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">Trust Score</span>
                      <div className="text-base font-extrabold text-emerald-400">
                        {resultData?.trust_score?.overall_score || 93.4}%
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold text-xs rounded-lg">
                      Grade {resultData?.trust_score?.grade || 'A'}
                    </span>
                  </div>

                  <button
                    onClick={() => setStep('idle')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* State 6: Failed */}
              {step === 'failed' && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-300">Verification Rejected</h3>
                    <p className="text-[11px] text-rose-400/90 mt-1">
                      {resultData?.rejection_reasons?.[0] || 'Biometric security threshold not satisfied'}
                    </p>
                  </div>

                  <button
                    onClick={() => setStep('idle')}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
                  >
                    Retry Attempt
                  </button>
                </div>
              )}

              {/* Attendance History */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Live Attendance Log
                </span>
                {history.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-2">
                    No entries logged this session yet.
                  </p>
                ) : (
                  history.map((h, i) => (
                    <div
                      key={h.id || i}
                      className="bg-slate-800/40 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{h.student}</div>
                        <div className="text-[10px] text-slate-400">{h.subject}</div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                        {h.status} ({h.score}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Bottom Bar Indicator */}
            <div className="h-6 flex items-center justify-center z-20">
              <div className="w-24 h-1 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
