"use client";
import React, { useState } from 'react';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { requestPasswordReset } from '../actions/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mockLink, setMockLink] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await requestPasswordReset(email);
    
    // Mostramos sucesso mesmo se falhar ou email n existir por seguranca
    setIsSuccess(true);
    if (res.mockLink) {
      setMockLink(res.mockLink);
    }
    
    setIsLoading(false);
  };

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
          <h1 className="text-3xl font-bold text-white mb-2 tracking-wide">Recuperar Senha</h1>
          <p className="text-slate-400 text-sm tracking-wide px-4">
            Digite seu e-mail corporativo e enviaremos as instruções para criar uma nova senha.
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
          {isSuccess ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send size={32} />
              </div>
              <h3 className="text-white font-medium text-lg">E-mail Enviado!</h3>
              <p className="text-slate-400 text-sm">
                Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link de recuperação em instantes.
              </p>
              
              {/* Mock link area so user doesn't have to look at terminal */}
              {mockLink && (
                <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 text-left">
                  <p className="text-xs text-slate-500 mb-2">Simulação do E-mail (Apenas para Testes):</p>
                  <a href={mockLink} className="text-[#4ADE80] text-sm break-all hover:underline">
                    Clique aqui para resetar sua senha
                  </a>
                </div>
              )}

              <button
                onClick={() => router.push('/login')}
                className="w-full py-3 mt-4 rounded-xl font-bold text-sm text-[#0a1a33] bg-gradient-to-r from-[#4ADE80] to-[#22c55e]"
              >
                Voltar ao Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-7">
              <div>
                <label className="block text-xs text-slate-400 mb-2 tracking-wide">Email Corporativo</label>
                <div className="relative flex items-center group">
                  <Mail className="absolute left-1 text-slate-500 transition-colors duration-300 group-focus-within:text-[#4ADE80]" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-transparent border-0 border-b border-slate-600 text-white text-sm placeholder-slate-500 transition-all duration-300 focus:outline-none focus:ring-0 focus:border-[#4ADE80] focus:shadow-[0_1px_0_0_#4ADE80]"
                    placeholder="voce@way.com"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl font-bold text-[15px] tracking-wide flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #4ADE80 0%, #22c55e 100%)', color: '#0a1a33' }}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#0a1a33] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Enviar Link de Recuperação"
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm text-slate-300 flex items-center justify-center gap-2 hover:text-white transition-colors"
                >
                  <ArrowLeft size={16} />
                  Voltar ao Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
