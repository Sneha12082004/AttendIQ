import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleTab, setRoleTab] = useState<'faculty' | 'admin'>('faculty')
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await login({ email, password })
      if (user.role === 'admin') {
        navigate('/admin/dashboard')
      } else {
        navigate('/faculty/dashboard')
      }
    } catch {
      // error handled by useAuth
    }
  }

  const fillDemo = (demoEmail: string, demoRole: 'faculty' | 'admin') => {
    setEmail(demoEmail)
    setPassword('Demo@123')
    setRoleTab(demoRole)
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      {/* Background aesthetic glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-teal-600/30 mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AttendIQ</h1>
          <p className="text-sm text-slate-400 mt-1">
            AI-Driven Geo-Fenced & Biometric Attendance System
          </p>
          <span className="inline-block mt-2 text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-950/60 border border-teal-800/60 px-2.5 py-0.5 rounded-full">
            Problem Statement CIH-001
          </span>
        </div>

        {/* Card */}
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-xl">
          {/* Role tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-700/60">
            <button
              type="button"
              onClick={() => setRoleTab('faculty')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                roleTab === 'faculty'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Faculty Portal
            </button>
            <button
              type="button"
              onClick={() => setRoleTab('admin')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                roleTab === 'admin'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Admin Portal
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Institutional Email
              </label>
              <Input
                type="email"
                placeholder={roleTab === 'faculty' ? 'dr.mehta@attendiq.demo' : 'admin@attendiq.demo'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full mt-2"
            >
              Sign In to {roleTab === 'faculty' ? 'Faculty Portal' : 'Admin Console'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          {/* Quick Demo Credentials Fillers */}
          <div className="mt-6 pt-6 border-t border-slate-700/60">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              ⚡ 1-Click Demo Accounts (Evaluator Quick Access)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('dr.mehta@attendiq.demo', 'faculty')}
                className="p-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-slate-700 text-left transition-colors text-slate-300 hover:text-white"
              >
                <div className="font-semibold text-teal-400">Dr. Priya Mehta</div>
                <div className="text-[10px] text-slate-400">Faculty (CS Dept)</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@attendiq.demo', 'admin')}
                className="p-2.5 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-slate-700 text-left transition-colors text-slate-300 hover:text-white"
              >
                <div className="font-semibold text-teal-400">System Admin</div>
                <div className="text-[10px] text-slate-400">Admin Console</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Attendance attempts authenticated via Classroom Geofence & Biometrics
        </p>
      </div>
    </div>
  )
}
