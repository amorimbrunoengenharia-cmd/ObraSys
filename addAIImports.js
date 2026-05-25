const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

const aiImport = "import { askAICenter } from '../../app/actions/ai';\n";
content = content.replace(
  "import NotificationBell from '../NotificationBell';",
  aiImport + "import NotificationBell from '../NotificationBell';"
);

content = content.replace(
  'TrendingUp, DollarSign, Briefcase, RefreshCw, History',
  'TrendingUp, DollarSign, Briefcase, RefreshCw, History, Sparkles'
);

fs.writeFileSync(file, content);
console.log('Added AI imports');
