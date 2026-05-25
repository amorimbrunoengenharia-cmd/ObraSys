const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import useAuth
if (!content.includes("useAuth")) {
    content = content.replace(
        "import { usePathname, useRouter, useSearchParams } from 'next/navigation';",
        "import { usePathname, useRouter, useSearchParams } from 'next/navigation';\nimport { useAuth } from '../AuthContext';"
    );
}

// 2. Add LogOut to lucide-react imports
if (!content.includes("LogOut")) {
    content = content.replace(
        "ArrowLeft, Download, Filter, MoreVertical, Building2,",
        "ArrowLeft, Download, Filter, MoreVertical, Building2, LogOut,"
    );
}

// 3. Destructure user, logout
if (!content.includes("const { user, logout } = useAuth();")) {
    content = content.replace(
        "const router = useRouter();",
        "const router = useRouter();\n    const { user, logout } = useAuth();"
    );
}

// 4. Hide Back button for Orçamentista
content = content.replace(
    /<Link href="\/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400[^>]*>\s*<ArrowLeft size=\{20\} \/>\s*<\/Link>/,
    `{userRole !== 'Orçamentista' && (
              <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                <ArrowLeft size={20} />
              </Link>
            )}`
);

// 5. Inject User Profile & Logout
const oldRightSide = `          <div className="flex items-center gap-4">\r\n             <NotificationBell />`;
const oldRightSideLF = `          <div className="flex items-center gap-4">\n             <NotificationBell />`;

const newRightSide = `          <div className="flex items-center gap-4">
             {userRole === 'Orçamentista' && (
               <>
                  <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>
                  <Link href="/perfil" className="hidden sm:flex items-center gap-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors group">
                      <div className="text-right">
                          <p className="text-sm font-bold leading-none group-hover:text-indigo-500 transition-colors">{user?.name || 'Usuário'}</p>
                          <p className="text-[10px] text-slate-500 uppercase">{user?.role || 'Cargo'}</p>
                      </div>
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold border-2 border-white dark:border-slate-600 shadow-sm group-hover:border-indigo-500 transition-colors">
                          {user?.name?.charAt(0) || 'U'}
                      </div>
                  </Link>
               </>
             )}
             <NotificationBell />
             {userRole === 'Orçamentista' && (
               <button
                   onClick={() => {
                       logout();
                       router.push('/login');
                   }}
                   className="p-2 text-slate-500 hover:text-red-500 transition-colors"
                   title="Sair"
               >
                   <LogOut size={18} />
               </button>
             )}`;

if (content.includes(oldRightSide)) {
    content = content.replace(oldRightSide, newRightSide);
} else if (content.includes(oldRightSideLF)) {
    content = content.replace(oldRightSideLF, newRightSide);
} else {
    // try a regex fallback
    content = content.replace(/<div className="flex items-center gap-4">\s*<NotificationBell \/>/, newRightSide);
}

fs.writeFileSync(file, content);
console.log('Injected profile and logout properly.');
