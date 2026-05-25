"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/AuthContext';

/* ──────────────────────────────────────────────────────────────
   ObraSys Enterprise — Premium Login Page
   Stack: Next 16 · React 19 · Tailwind CSS v4 · Lucide React
   Design: Dark‑mode · Glassmorphism · Neon accents
   ────────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { authenticateUser } = await import('../actions/auth');
    const res = await authenticateUser(email, password);
    
    if (res.success && res.user) {
      login(res.user);
      if (res.user.role === 'Almoxarife') {
        router.push('/suprimentos');
      } else if (res.user.role === 'TI') {
        router.push('/ti');
      } else if (res.user.role === 'RH / DP' || res.user.role.includes('RH')) {
        router.push('/rh');
      } else if (res.user.role === 'Orçamentista') {
        router.push('/orcamentos');
      } else {
        router.push('/');
      }
    } else {
      alert(res.error || 'Credenciais inválidas!');
    }
    
    setIsLoading(false);
  };

  /* ─── JSX ────────────────────────────────────────────────── */
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #163a4a 0%, #0f2847 35%, #0a1a33 70%, #060e1f 100%)',
      }}
    >
      {/* ════════════ BACKGROUND AMBIENT LIGHTS ════════════ */}
      {/* Top‑center teal glow */}
      <div
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(20,180,160,0.18) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      {/* Bottom‑left green accent */}
      <div
        className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
      {/* Top‑right blue accent */}
      <div
        className="absolute top-[-8%] right-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(96,165,250,0.10) 0%, transparent 70%)',
          filter: 'blur(100px)',
        }}
      />

      {/* ════════════ SVG BACKGROUND PATTERNS ════════════ */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        {/* Elegant swirl curves */}
        <path
          d="M-80,220 C120,170 320,330 520,240 C720,150 920,360 1200,280"
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.2"
        />
        <path
          d="M-40,500 C160,450 380,600 580,500 C780,400 960,550 1300,480"
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"
        />
        <path
          d="M1400,150 C1100,200 900,80 700,180 C500,280 300,120 -50,220"
          fill="none" stroke="rgba(142,241,81,0.06)" strokeWidth="0.8"
        />
        <path
          d="M1300,700 C1050,750 800,620 600,720 C400,820 200,680 -100,770"
          fill="none" stroke="rgba(142,241,81,0.04)" strokeWidth="0.8"
        />
        {/* Floating grid dots */}
        {[
          [150, 180], [350, 120], [550, 280], [750, 160], [950, 300],
          [1100, 200], [200, 450], [400, 520], [700, 480], [900, 560],
          [1050, 420], [300, 700], [600, 650], [850, 720], [1150, 600],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={1.2} fill="rgba(255,255,255,0.12)" />
        ))}
        {/* Accent green dots */}
        {[
          [250, 260], [680, 350], [1020, 480], [430, 680],
        ].map(([cx, cy], i) => (
          <circle key={`g-${i}`} cx={cx} cy={cy} r={1.8} fill="rgba(142,241,81,0.25)" />
        ))}
      </svg>

      {/* ════════════ FLOATING 3D CUBES ════════════ */}
      {/* Small translucent cubes scattered around the logo area */}
      <div className="absolute pointer-events-none" style={{ top: '12%', right: '28%' }}>
        <div
          className="w-4 h-4 border border-white/15 bg-white/5 rotate-[25deg]"
          style={{ animation: 'floatCube 6s ease-in-out infinite' }}
        />
      </div>
      <div className="absolute pointer-events-none" style={{ top: '18%', left: '30%' }}>
        <div
          className="w-3 h-3 border border-white/10 bg-white/[0.03] rotate-[45deg]"
          style={{ animation: 'floatCube 8s ease-in-out infinite 1s' }}
        />
      </div>
      <div className="absolute pointer-events-none" style={{ top: '25%', right: '22%' }}>
        <div
          className="w-5 h-5 border border-[#4ADE80]/20 bg-[#4ADE80]/5 rotate-[15deg]"
          style={{ animation: 'floatCube 7s ease-in-out infinite 0.5s' }}
        />
      </div>
      <div className="absolute pointer-events-none" style={{ top: '8%', right: '35%' }}>
        <div
          className="w-2.5 h-2.5 border border-white/10 bg-white/[0.04] rotate-[35deg]"
          style={{ animation: 'floatCube 9s ease-in-out infinite 2s' }}
        />
      </div>
      <div className="absolute pointer-events-none" style={{ top: '30%', left: '25%' }}>
        <div
          className="w-3.5 h-3.5 border border-[#4ADE80]/15 bg-[#4ADE80]/[0.03] rotate-[55deg]"
          style={{ animation: 'floatCube 7.5s ease-in-out infinite 1.5s' }}
        />
      </div>

      {/* ════════════ MAIN CONTENT ════════════ */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">

        {/* ──── LOGO AREA ──── */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="flex justify-center items-center mb-5 relative">
            {/* Green glow behind logo */}
            <div
              className="absolute w-40 h-40 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(142,241,81,0.25) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />

            {/* ──── WS Logo SVG (Wireframe + Solid) ──── */}
            <svg
              width="160" height="120" viewBox="0 0 160 120"
              fill="none" xmlns="http://www.w3.org/2000/svg"
              className="relative z-10 drop-shadow-[0_0_20px_rgba(142,241,81,0.3)]"
            >
              {/* ── Wireframe W (left half) ── */}
              <g opacity="0.7">
                <path
                  d="M15 25 L35 85 L55 40"
                  fill="none" stroke="#4ADE80" strokeWidth="1.5" strokeDasharray="3 3"
                />
                <path
                  d="M15 25 L55 40 M35 85 L55 40"
                  fill="none" stroke="#4ADE80" strokeWidth="0.6" strokeDasharray="2 2"
                />
                {/* Wireframe structural lines */}
                <path d="M25 55 L45 30" fill="none" stroke="#4ADE80" strokeWidth="0.4" strokeDasharray="2 3" />
              </g>

              {/* ── Solid Green WS mark ── */}
              <g>
                {/* W solid base */}
                <path d="M30 25 L50 85 L65 50 L80 85 L100 25" fill="none" stroke="#4ADE80" strokeWidth="3" strokeLinejoin="round" />
                {/* Solid V / checkmark */}
                <path d="M55 35 L75 75 L120 20" fill="#4ADE80" opacity="0.9" />
                {/* Upper triangle accent */}
                <path d="M95 20 L110 20 L102 38 Z" fill="#4ADE80" />
                {/* Mid triangle */}
                <path d="M70 50 L85 50 L77 35 Z" fill="#4ADE80" opacity="0.6" />
              </g>

              {/* ── Floating cubes near logo ── */}
              <rect x="130" y="25" width="12" height="12" rx="1" fill="#4ADE80" opacity="0.5" transform="rotate(20 136 31)">
                <animateTransform attributeName="transform" type="rotate" from="20 136 31" to="380 136 31" dur="20s" repeatCount="indefinite" />
              </rect>
              <rect x="140" y="55" width="8" height="8" rx="1" fill="#4ADE80" opacity="0.3" transform="rotate(45 144 59)">
                <animateTransform attributeName="transform" type="rotate" from="45 144 59" to="405 144 59" dur="25s" repeatCount="indefinite" />
              </rect>
              <rect x="10" y="70" width="9" height="9" rx="1" fill="#4ADE80" opacity="0.35" transform="rotate(30 14 74)">
                <animateTransform attributeName="transform" type="rotate" from="30 14 74" to="390 14 74" dur="22s" repeatCount="indefinite" />
              </rect>
              <rect x="5" y="15" width="6" height="6" rx="1" fill="#4ADE80" opacity="0.6" transform="rotate(10 8 18)">
                <animateTransform attributeName="transform" type="rotate" from="10 8 18" to="370 8 18" dur="18s" repeatCount="indefinite" />
              </rect>

              {/* ── Sparkle dots ── */}
              <circle cx="125" cy="15" r="1.5" fill="#4ADE80" opacity="0.5">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="145" cy="45" r="1" fill="#4ADE80" opacity="0.4">
                <animate attributeName="opacity" values="0.4;0.9;0.4" dur="4s" repeatCount="indefinite" />
              </circle>
              <circle cx="8" cy="50" r="1.2" fill="#4ADE80" opacity="0.4">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3.5s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Title */}
          <h1
            className="text-3xl font-bold text-white mb-1 tracking-wide"
            style={{ textShadow: '0 0 20px rgba(255,255,255,0.25), 0 0 40px rgba(255,255,255,0.08)' }}
          >
            ObraSys Enterprise
          </h1>
          {/* Subtitle */}
          <p className="text-slate-400 text-sm tracking-wide">
            Sistema de Gestão de Obras
          </p>
        </div>

        {/* ──── GLASSMORPHISM CARD ──── */}
        <div
          className="w-full rounded-2xl p-8 border border-white/10 relative"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <form onSubmit={handleLogin} className="space-y-7">
            {/* ─── Email Input ─── */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 tracking-wide">
                Email Corporativo
              </label>
              <div className="relative flex items-center group">
                <User
                  className="absolute left-1 text-slate-500 transition-colors duration-300 group-focus-within:text-[#4ADE80]"
                  size={18}
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="
                    w-full pl-8 pr-4 py-2.5
                    bg-transparent
                    border-0 border-b border-slate-600
                    text-white text-sm
                    placeholder-slate-500
                    transition-all duration-300
                    focus:outline-none focus:ring-0
                    focus:border-[#4ADE80]
                    focus:shadow-[0_1px_0_0_#4ADE80]
                  "
                  placeholder="ceo@way.com"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* ─── Password Input ─── */}
            <div>
              <label className="block text-xs text-slate-400 mb-2 tracking-wide">
                Senha
              </label>
              <div className="relative flex items-center group">
                <Lock
                  className="absolute left-1 text-slate-500 transition-colors duration-300 group-focus-within:text-[#4ADE80]"
                  size={18}
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="
                    w-full pl-8 pr-12 py-2.5
                    bg-transparent
                    border-0 border-b border-slate-600
                    text-white text-sm
                    placeholder-slate-500
                    transition-all duration-300
                    focus:outline-none focus:ring-0
                    focus:border-[#4ADE80]
                    focus:shadow-[0_1px_0_0_#4ADE80]
                  "
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 text-slate-500 hover:text-slate-300 transition-colors duration-200"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <a href="/esqueceu-senha" className="text-[11px] text-slate-400 hover:text-[#4ADE80] transition-colors">
                  Esqueceu sua senha?
                </a>
              </div>
            </div>

            {/* ─── Submit Button (Neon Glow) ─── */}
            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="
                w-full py-3.5 mt-2 rounded-xl
                font-bold text-[15px] tracking-wide
                flex items-center justify-center gap-2
                transition-all duration-300
                disabled:opacity-50 disabled:cursor-not-allowed
                cursor-pointer
              "
              style={{
                background: 'linear-gradient(135deg, #4ADE80 0%, #22c55e 100%)',
                color: '#0a1a33',
                boxShadow: '0 0 20px rgba(74,222,128,0.35), 0 0 60px rgba(74,222,128,0.10)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(74,222,128,0.55), 0 0 80px rgba(74,222,128,0.20)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 20px rgba(74,222,128,0.35), 0 0 60px rgba(74,222,128,0.10)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[#0a1a33] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>


        </div>

        {/* ─── Footer ─── */}
        <p className="mt-6 text-[11px] text-slate-600 tracking-wide text-center">
          © 2026 Way Service · Todos os direitos reservados
        </p>
      </div>

      {/* ════════════ GLOBAL STYLES & KEYFRAME ANIMATIONS ════════════ */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Prevent browser autofill from breaking transparent inputs */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px transparent inset !important;
          -webkit-text-fill-color: #fff !important;
          transition: background-color 5000s ease-in-out 0s;
          background-color: transparent !important;
        }

        @keyframes floatCube {
          0%, 100% { transform: translateY(0px) rotate(25deg); }
          50%      { transform: translateY(-12px) rotate(40deg); }
        }

        @keyframes subtlePulse {
          0%, 100% { box-shadow: 0 0 20px rgba(74,222,128,0.35), 0 0 60px rgba(74,222,128,0.10); }
          50%      { box-shadow: 0 0 25px rgba(74,222,128,0.45), 0 0 70px rgba(74,222,128,0.15); }
        }
      `}} />
    </div>
  );
}
