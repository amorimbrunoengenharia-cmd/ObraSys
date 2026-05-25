const fs = require('fs');

const file = 'components/modules/RH.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Conditionally render the Back button
content = content.replace(
  `<Link href="/" className="mr-4 text-slate-400 hover:text-rose-500 transition-colors"><ArrowLeft size={24} /></Link>`,
  `{userRole !== 'RH / DP' && (
              <Link href="/" className="mr-4 text-slate-400 hover:text-rose-500 transition-colors"><ArrowLeft size={24} /></Link>
            )}`
);

// 2. Add Profile and Logout buttons
const newIconsHTML = `
            <div className="flex items-center gap-4">
              <NotificationBell />
              {userRole === 'RH / DP' && (
                 <div className="flex items-center gap-2">
                    <button className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 hover:bg-slate-300" title="Perfil">
                      <User size={16} />
                    </button>
                    <button onClick={() => router.push('/')} className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200" title="Sair">
                      <LogOut size={16} />
                    </button>
                 </div>
              )}
            </div>
`;
content = content.replace(
  `<div className="flex items-center gap-4">\n              <NotificationBell />\n            </div>`,
  newIconsHTML.trim()
);

// 3. Make sure User and LogOut are imported
if (!content.includes('User,')) content = content.replace('Users,', 'Users, User, LogOut,');

fs.writeFileSync(file, content, 'utf8');
console.log("updateRHHeader.js applied!");
