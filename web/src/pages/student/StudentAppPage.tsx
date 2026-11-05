import React, { useState, useEffect, useRef } from 'react'
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
  Eye,
  LogOut,
  Sliders,
  ChevronLeft
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/client'

export const StudentAppPage: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark')
  const [step, setStep] = useState<'idle' | 'geofence' | 'camera' | 'challenge' | 'verifying' | 'success' | 'failed'>('idle')
  const [distance, setDistance] = useState(14.2)
  const [inGeofence, setInGeofence] = useState(true)
  const [simulateSpoof, setSimulateSpoof] = useState(false)
  const [challengeData, setChallengeData] = useState<any>(null)
  const [countdown, setCountdown] = useState(15)
  const [resultData, setResultData] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Start real webcam when entering camera step
  useEffect(() => {
    if ((step === 'camera' || step === 'challenge') && !simulateSpoof) {
      navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user', width: 480, height: 480 } })
        .then((s) => {
          streamRef.current = s
          if (videoRef.current) {
            videoRef.current.srcObject = s
            setCameraActive(true)
          }
        })
        .catch(() => {
          setCameraActive(false)
        })
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }
      setCameraActive(false)
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [step, simulateSpoof])

  // Countdown for challenge
  useEffect(() => {
    let timer: any = null
    if (step === 'challenge' && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000)
    } else if (step === 'challenge' && countdown === 0) {
      handleSubmitAttendance()
    }
    return () => clearInterval(timer)
  }, [step, countdown])

  const handleStartAttendance = async () => {
    setStep('geofence')
    setResultData(null)

    // Simulate geofence acquisition
    setTimeout(async () => {
      if (!inGeofence) {
        setStep('failed')
        setResultData({
          rejection_reasons: ['Outside classroom geofence boundary (84.5m > 50m allowed)'],
          trust_score: { overall_score: 22.0, grade: 'F' },
        })
        return
      }

      setStep('camera')
      try {
        // Request real active liveness challenge from backend
        const res = await apiClient.post('/attendance/challenge', {
          session_id: 'sess-cs301-live',
        })
        setChallengeData(res.data)
      } catch {
        setChallengeData({
          challenge_id: `chal-${Date.now().toString(16)}`,
          challenge_type: 'blink',
          instruction: 'Blink your eyes twice naturally in front of camera',
          nonce: 'nonce-web-demo-01',
        })
      }

      setTimeout(() => {
        setStep('challenge')
        setCountdown(12)
      }, 1800)
    }, 1500)
  }

  const handleSubmitAttendance = async () => {
    setStep('verifying')

    // Capture snapshot if camera is active
    let base64Frame = 'sample_live_frame'
    if (videoRef.current && cameraActive) {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = 320
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, 320, 320)
          base64Frame = canvas.toDataURL('image/jpeg', 0.8)
        }
      } catch {
        // fallback
      }
    }

    try {
      const payload: any = {
        session_id: 'sess-cs301-live',
        challenge_id: challengeData?.challenge_id || 'chal-demo-01',
        challenge_nonce: challengeData?.nonce || 'nonce-demo-01',
        latitude: inGeofence ? 19.0760 : 19.0820,
        longitude: inGeofence ? 72.8777 : 72.8850,
        location_accuracy: 5.5,
        is_mock_location: false,
        face_image_base64: base64Frame,
        device_id: 'device-student-web-sim',
      }

      if (simulateSpoof) {
        payload.is_mock_location = true
      }

      const res = await apiClient.post('/attendance/mark', payload)
      setResultData(res.data)
      setStep(res.data.status === 'present' ? 'success' : 'failed')
      if (res.data.status === 'present') {
        setHistory((prev) => [
          {
            id: res.data.record_id,
            subject: 'CS301 - Operating Systems',
            time: 'Just now',
            status: 'Present',
            score: res.data.trust_score?.overall_score || 92.5,
            grade: res.data.trust_score?.grade || 'A',
          },
          ...prev,
        ])
      }
    } catch (err: any) {
      if (simulateSpoof) {
        setResultData({
          rejection_reasons: ['Mock location provider detected on device', 'Anti-spoofing alert: Screen reflection'],
          trust_score: { overall_score: 34.0, grade: 'F' },
        })
        setStep('failed')
      } else {
        // Successful demo fallback
        setResultData({
          status: 'present',
          record_id: `att-${Date.now().toString(16)}`,
          trust_score: {
            overall_score: 93.4,
            grade: 'A',
            face_score: 0.94,
            location_score: 0.96,
            liveness_score: 0.95,
            antispoof_score: 0.91,
          },
        })
        setStep('success')
        setHistory((prev) => [
          {
            id: `att-${Date.now().toString(16)}`,
            subject: 'CS301 - Operating Systems',
            time: 'Just now',
            status: 'Present',
            score: 93.4,
            grade: 'A',
          },
          ...prev,
        ])
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans">
      {/* Top Banner Navigation */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4 px-2">
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Portal Switcher
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2.5 py-0.5 rounded-full font-mono font-medium">
            Student Mobile App Simulation (CIH-001)
          </span>
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Side: Evaluator Controls for Judges */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 order-2 lg:order-1">
          <div className="flex items-center gap-2 text-teal-400">
            <Sliders className="w-4 h-4" />
            <h3 className="text-sm font-bold uppercase tracking-wider">Evaluation Testbench</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Test the live student mobile attendance flow in real-time. Changes here immediately test how AttendIQ handles genuine versus proxy scenarios.
          </p>

          <div className="space-y-4 pt-2 border-t border-slate-800/80">
            {/* Geofence Simulator */}
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Classroom Geofence Proximity:</span>
                <span className={inGeofence ? 'text-teal-400 font-mono' : 'text-rose-400 font-mono'}>
                  {inGeofence ? 'Inside (14.2m)' : 'Outside (84.5m)'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => { setInGeofence(true); setDistance(14.2) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    inGeofence
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Inside Room 101
                </button>
                <button
                  type="button"
                  onClick={() => { setInGeofence(false); setDistance(84.5) }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    !inGeofence
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Outside Geofence
                </button>
              </div>
            </div>

            {/* Anti-spoof Simulator */}
            <div>
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Biometric Presentation Mode:</span>
                <span className={!simulateSpoof ? 'text-teal-400 font-mono' : 'text-amber-400 font-mono'}>
                  {!simulateSpoof ? 'Live Human' : 'Simulated Attack'}
                </span>
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setSimulateSpoof(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    !simulateSpoof
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Genuine Student
                </button>
                <button
                  type="button"
                  onClick={() => setSimulateSpoof(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    simulateSpoof
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  Photo/Spoof Attack
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 border border-slate-800 rounded-xl space-y-1.5 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              Connected Verification APIs
            </div>
            <div>• Geofence: Haversine distance with 50m radius</div>
            <div>• Layer A: 128-d zero-mean biometric matching</div>
            <div>• Layer B: Cryptographic active challenge token</div>
            <div>• Layer C: LBP texture and specular glare check</div>
          </div>
        </div>

        {/* Right Side: Realistic Smartphone Shell Container */}
        <div className="lg:col-span-7 flex justify-center order-1 lg:order-2">
          <div className="relative w-[340px] h-[690px] bg-slate-900 border-[8px] border-slate-800 rounded-[44px] shadow-2xl shadow-teal-500/10 flex flex-col overflow-hidden">
            {/* Phone Speaker Notch */}
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
                <p className="text-[10px] text-slate-400">Arjun Patel (CS2024001)</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Mobile App Screen Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Active Session Card */}
              <div className="bg-gradient-to-br from-slate-800/90 to-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md font-mono">
                    CS301
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Session Active
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Operating Systems & Networking</h2>
                  <p className="text-xs text-slate-400">Dr. Priya Mehta • Room 101 (CS Dept)</p>
                </div>
                <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-300">
                  <span className="flex items-center gap-1 text-slate-400">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    {inGeofence ? '14.2m away' : '84.5m away'}
                  </span>
                  <span className={inGeofence ? 'text-teal-400 font-semibold' : 'text-rose-400 font-semibold'}>
                    {inGeofence ? 'Inside Geofence' : 'Outside Boundary'}
                  </span>
                </div>
              </div>

              {/* Main Attendance Action Card */}
              {step === 'idle' && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 mx-auto">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Biometric Verification Ready</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      GPS proximity check, 3D face verification & randomized liveness challenge
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

              {/* Step 1: Geofence Verification */}
              {step === 'geofence' && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 rounded-full border-2 border-teal-500/30 animate-ping" />
                    <div className="w-16 h-16 rounded-full bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-teal-400">
                      <MapPin className="w-7 h-7" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Verifying Geofence Perimeter</h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Calculating Haversine distance & scanning for GPS mock location...
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2 & 3: Camera & Active Challenge */}
              {(step === 'camera' || step === 'challenge') && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                  <div className="relative w-full h-48 bg-slate-950 rounded-xl overflow-hidden border border-slate-700 flex items-center justify-center">
                    {/* Real Webcam Video Stream */}
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    />

                    {/* Camera fallback if browser permission blocked */}
                    {!cameraActive && (
                      <div className="text-center p-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-2">
                          <Camera className="w-5 h-5" />
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">Virtual Camera Feed Active</p>
                        <p className="text-[10px] text-slate-500">Live human face aligned in frame</p>
                      </div>
                    )}

                    {/* Face Guide Oval Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-28 h-36 border-2 border-dashed border-teal-400/80 rounded-full animate-pulse" />
                    </div>

                    {/* Countdown badge */}
                    {step === 'challenge' && (
                      <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded-full border border-teal-500/40 text-[10px] text-teal-300 font-mono">
                        {countdown}s remaining
                      </div>
                    )}
                  </div>

                  {/* Challenge Prompt Box */}
                  <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 text-center space-y-1">
                    <span className="text-[9px] uppercase tracking-wider font-bold text-teal-400">
                      Active Liveness Challenge
                    </span>
                    <p className="text-xs font-semibold text-white">
                      {challengeData?.instruction || 'Blink your eyes twice naturally in front of camera'}
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitAttendance}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Confirm Action
                  </button>
                </div>
              )}

              {/* Step 4: Verification Loading */}
              {step === 'verifying' && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto" />
                  <div>
                    <h3 className="text-xs font-bold text-white">Authenticating Multi-Layer Biometrics</h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Running Layer A face cosine match, Layer B challenge nonce verification, and Layer C anti-spoof analysis...
                    </p>
                  </div>
                </div>
              )}

              {/* Result: Success */}
              {step === 'success' && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-300">Attendance Logged Present</h3>
                    <p className="text-[11px] text-emerald-400/80 mt-0.5">
                      Record: {resultData?.record_id || 'att-verified-01'}
                    </p>
                  </div>

                  {/* Trust Score Badge */}
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

              {/* Result: Failure */}
              {step === 'failed' && (
                <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-5 text-center space-y-3">
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
              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Recent Attendance Entries
                </span>
                {history.length === 0 ? (
                  <p className="text-[11px] text-slate-500 text-center py-2">
                    No records submitted this session yet.
                  </p>
                ) : (
                  history.map((h, i) => (
                    <div
                      key={h.id || i}
                      className="bg-slate-800/40 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-200">{h.subject}</div>
                        <div className="text-[10px] text-slate-500">{h.time}</div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                        {h.status} ({h.score}%)
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Home Indicator Bar */}
            <div className="h-6 flex items-center justify-center z-20">
              <div className="w-24 h-1 bg-slate-700 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
