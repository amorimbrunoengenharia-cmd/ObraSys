"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { validateResetToken, resetPassword } from '../actions/auth';

function ResetPasswordForm() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    async function checkToken() {
      if (!token) {
        setErrorMsg("Token não encontrado na URL.");
        setIsValidating(false);
        return;
      }

      const res = await validateResetToken(token);
      if (res.success && res.email) {
        setUserEmail(res.email);
      } else {
        setErrorMsg(res.error || "Token inválido.");
      }
      setIsValidating(false);
    }
    checkToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    if (!token) return;

    setIsLoading(true);
    const res = await resetPassword(token, newPassword);
    
    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      alert(res.error || "Falha ao redefinir a senha.");
    }
    setIsLoading(false);
  };

  if (isValidating) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="w-8 h-8 border-2 border-[#4ADE80] border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm tracking-wide">Validando link seguro...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="text-center p-6 space-y-6">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} />
        </div>
        <h3 className="text-white font-medium text-lg">Link Inválido</h3>
        <p className="text-slate-400 text-sm">{errorMsg}</p>
        <button
          onClick={() => router.push('/esqueceu-senha')}
          className="w-full py-3 mt-4 rounded-xl font-bold text-sm text-[#0a1a33] bg-gradient-to-r from-[#4ADE80] to-[#22c55e]"
        >
          Solicitar Novo Link
        </button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center p-6 space-y-6">
        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-white font-medium text-lg">Senha Alterada!</h3>
        <p className="text-slate-400 text-sm">
          Sua senha foi redefinida com sucesso. Redirecionando para o login...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      <div className="mb-6">
        <p className="text-xs text-slate-500">
          Redefinindo senha para:<br/>
          <strong className="text-slate-300 text-sm">{userEmail}</strong>
        </p>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-2 tracking-wide">Nova Senha</label>
        <div className="relative flex items-center group">
          <Lock className="absolute left-1 text-slate-500 transition-colors duration-300 group-focus-within:text-[#4ADE80]" size={18} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full pl-8 pr-12 py-2.5 bg-transparent border-0 border-b border-slate-600 text-white text-sm placeholder-slate-500 transition-all duration-300 focus:outline-none focus:ring-0 focus:border-[#4ADE80] focus:shadow-[0_1px_0_0_#4ADE80]"
            placeholder="••••••••"
            required
            minLength={6}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-2 tracking-wide">Confirmar Nova Senha</label>
        <div className="relative flex items-center group">
          <Lock className="absolute left-1 text-slate-500 transition-colors duration-300 group-focus-within:text-[#4ADE80]" size={18} />
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full pl-8 pr-12 py-2.5 bg-transparent border-0 border-b border-slate-600 text-white text-sm placeholder-slate-500 transition-all duration-300 focus:outline-none focus:ring-0 focus:border-[#4ADE80] focus:shadow-[0_1px_0_0_#4ADE80]"
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 mt-2 rounded-xl font-bold text-[15px] tracking-wide flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={{ background: 'linear-gradient(135deg, #4ADE80 0%, #22c55e 100%)', color: '#0a1a33' }}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-[#0a1a33] border-t-transparent rounded-full animate-spin" />
        ) : (
          "Salvar Nova Senha"
        )}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 30%, #163a4a 0%, #0f2847 35%, #0a1a33 70%, #060e1f 100%)',
      }}
    >
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(20,180,160,0.18) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute bottom-[-5%] left-[-5%] w-[500px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(74,222,128,0.08) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      <div className="absolute top-[-8%] right-[-5%] w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.10) 0%, transparent 70%)', filter: 'blur(100px)' }} />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">Nova Senha</h1>
          <p className="text-slate-400 text-sm tracking-wide px-4">
            Crie uma senha forte para proteger seu acesso.
          </p>
        </div>

        <div
          className="w-full rounded-2xl p-8 border border-white/10 relative"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <Suspense fallback={
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-2 border-[#4ADE80] border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
