const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add Lucide Icons
content = content.replace(
  'TrendingUp, DollarSign, Briefcase, RefreshCw, History',
  'TrendingUp, DollarSign, Briefcase, RefreshCw, History, Sparkles, Bot, Send, Loader2'
);

// Add action import
const aiImport = "import { askAICenter } from '../../app/actions/ai';\n";
content = content.replace(
  "import NotificationBell from '../NotificationBell';",
  aiImport + "import NotificationBell from '../NotificationBell';"
);

// Add state variables
const stateAnchor = "   const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState(false);";
const stateVars = `   const [isRevisionsModalOpen, setIsRevisionsModalOpen] = useState(false);
   const [isAiCenterOpen, setIsAiCenterOpen] = useState(false);
   const [aiPrompt, setAiPrompt] = useState('');
   const [isAiLoading, setIsAiLoading] = useState(false);
   const [aiChatHistory, setAiChatHistory] = useState<any[]>([{
      role: 'ai',
      text: 'Olá! Sou a sua Inteligência Artificial para Engenharia de Custos. O que você gostaria de orçar hoje?'
   }]);`;

content = content.replace(stateAnchor, stateVars);

// Add function
const funcAnchor = "   const handleLoadRevisions = async () => {";
const funcVars = `   const handleAskAICenter = async () => {
      if (!aiPrompt.trim()) return;
      
      const newHistory = [...aiChatHistory, { role: 'user', text: aiPrompt }];
      setAiChatHistory(newHistory);
      setAiPrompt('');
      setIsAiLoading(true);

      const contextStr = selectedEstimate ? \`Orçamento Atual: \${selectedEstimate.name}\` : undefined;
      const res = await askAICenter(aiPrompt, contextStr);
      
      setIsAiLoading(false);
      if (res.success) {
         setAiChatHistory([...newHistory, { role: 'ai', text: res.message, items: res.items }]);
      } else {
         setAiChatHistory([...newHistory, { role: 'ai', text: 'Desculpe, ocorreu um erro: ' + res.error }]);
      }
   };

   const handleLoadRevisions = async () => {`;

content = content.replace(funcAnchor, funcVars);

fs.writeFileSync(file, content);
console.log('Added AI States and Handlers');
