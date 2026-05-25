"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { shouldRedirectFromDashboard } from '../lib/permissions';

export default function DashboardClient({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
    // Redireciona perfis sem acesso ao Dashboard Executivo
    if (!isLoading && user && shouldRedirectFromDashboard(user.role)) {
      if (['Almoxarife', 'Comprador'].includes(user.role)) router.push('/suprimentos');
      else if (['Auxiliar Financeiro', 'Administrativo de Obra'].includes(user.role)) router.push('/financeiro');
      else if (['Orçamentista'].includes(user.role)) router.push('/orcamentos');
      else if (['TI'].includes(user.role)) router.push('/ti');
      else if (['RH / DP', 'Analista de RH', 'Assistente de RH'].includes(user.role)) router.push('/rh');
      else router.push('/perfil');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0B1121] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Auth guard puro — o header e boas-vindas ficam no GlobalDashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-[#0B1121] dark:to-[#162032]">
      {children}
    </div>
  );
}
