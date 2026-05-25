const fs = require('fs');

// Fix lib/permissions.ts
let permFile = 'lib/permissions.ts';
if (fs.existsSync(permFile)) {
    let permContent = fs.readFileSync(permFile, 'utf8');
    
    // Add Analista de RH to ROLES array if not exists
    if (!permContent.includes('"Analista de RH"')) {
        permContent = permContent.replace('"RH / DP",', '"RH / DP",\n  "Analista de RH",\n  "Assistente de RH",');
        permContent = permContent.replace(/\["Diretor", "TI", "RH \/ DP"\]/g, '["Diretor", "TI", "RH / DP", "Analista de RH", "Assistente de RH"]');
        permContent = permContent.replace(/"RH \/ DP"/g, '"RH / DP", "Analista de RH", "Assistente de RH"');
        permContent = permContent.replace('case "RH / DP":', 'case "RH / DP":\n    case "Analista de RH":\n    case "Assistente de RH":');
        
        fs.writeFileSync(permFile, permContent);
        console.log('Fixed permissions.ts');
    }
}

// Fix app/login/page.tsx
let loginFile = 'app/login/page.tsx';
if (fs.existsSync(loginFile)) {
    let loginContent = fs.readFileSync(loginFile, 'utf8');
    loginContent = loginContent.replace(
        "res.user.role === 'RH / DP'", 
        "res.user.role === 'RH / DP' || res.user.role.includes('RH')"
    );
    fs.writeFileSync(loginFile, loginContent);
    console.log('Fixed login page');
}

// Fix app/rh/page.tsx
let rhFile = 'app/rh/page.tsx';
if (fs.existsSync(rhFile)) {
    let rhContent = fs.readFileSync(rhFile, 'utf8');
    rhContent = rhContent.replace(
        "userRole !== 'RH / DP'", 
        "!userRole.includes('RH')"
    );
    // There are multiple places where RH / DP is checked in rh/page.tsx
    rhContent = rhContent.replace(/userRole !== 'RH \/ DP'/g, "!userRole.includes('RH')");
    fs.writeFileSync(rhFile, rhContent);
    console.log('Fixed rh page');
}
