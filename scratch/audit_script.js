const fs = require('fs');
const path = require('path');
const http = require('http');

const appDir = path.join(__dirname, '../app');
const baseUrl = 'http://localhost:3000';

async function fetchRoute(route) {
  return new Promise((resolve) => {
    http.get(`${baseUrl}${route}`, (res) => {
      resolve(res.statusCode);
    }).on('error', (e) => {
      resolve('Error: ' + e.message);
    });
  });
}

function getRoutes(dir, baseRoute = '') {
  let routes = [];
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      routes = routes.concat(getRoutes(fullPath, `${baseRoute}/${file}`));
    } else if (file === 'page.tsx' || file === 'page.ts' || file === 'page.jsx' || file === 'page.js') {
      let routePath = baseRoute === '' ? '/' : baseRoute;
      // Handle dynamic routes like [id] by replacing them with a dummy value, e.g., '1'
      const testRoutePath = routePath.replace(/\[.*?\]/g, '1');
      routes.push({
        fsPath: fullPath,
        route: testRoutePath,
        originalRoute: routePath
      });
    }
  }
  return routes;
}

async function runAudit() {
  console.log('Starting Audit...');
  const routes = getRoutes(appDir);
  
  const results = [];
  
  for (const r of routes) {
    const content = fs.readFileSync(r.fsPath, 'utf8');
    
    const hasPrisma = content.toLowerCase().includes('prisma');
    const hasMock = content.toLowerCase().includes('mock') || content.includes('fakeData') || content.includes('dummyData');
    
    let status = 'Pending';
    try {
      status = await fetchRoute(r.route);
    } catch (e) {
      status = 'Fetch Error';
    }
    
    results.push({
      route: r.originalRoute,
      testRoute: r.route,
      status: status,
      hasPrisma: hasPrisma,
      hasMock: hasMock,
      fsPath: r.fsPath
    });
  }
  
  // Format as Markdown table
  let md = '# Relatório de Auditoria Automatizada\n\n';
  md += '| Rota | Status HTTP | Integração Real (Prisma) | Dados Mockados |\n';
  md += '|---|---|---|---|\n';
  
  for (const res of results) {
    const statusStr = res.status === 200 ? '✅ 200 OK' : (res.status === 500 ? '❌ 500 Error' : `⚠️ ${res.status}`);
    const prismaStr = res.hasPrisma ? '✅ Sim' : '❌ Não';
    const mockStr = res.hasMock ? '⚠️ Sim' : '✅ Não';
    
    md += `| \`${res.route}\` | ${statusStr} | ${prismaStr} | ${mockStr} |\n`;
  }
  
  fs.writeFileSync(path.join(__dirname, 'audit_report.md'), md);
  console.log('Audit complete. Report saved to audit_report.md');
  console.log(md);
}

// Wait a bit for the server to be fully ready before auditing
setTimeout(runAudit, 5000);
