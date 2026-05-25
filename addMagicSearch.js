const fs = require('fs');
const file = 'components/modules/Orcamentos.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add state
content = content.replace(
  "const [isSearchingRef, setIsSearchingRef] = useState(false);",
  "const [isSearchingRef, setIsSearchingRef] = useState(false);\n  const [isAiSearching, setIsAiSearching] = useState(false);"
);

// Add logic
const handleSearchAnchor = "  const handleSearchRef = async () => {";
const handleSearchNew = `  const handleMagicSearch = async () => {
    if (!searchQuery) return;
    setIsAiSearching(true);
    setSearchResults([]);
    const res = await askAICenter(searchQuery, selectedEstimate?.name);
    if (res.success) {
      setSearchResults(res.items || []);
    } else {
      alert('Erro na busca IA: ' + res.error);
    }
    setIsAiSearching(false);
  };

  const handleSearchRef = async () => {`;
content = content.replace(handleSearchAnchor, handleSearchNew);

// Add Button
const buttonAnchor = `<button onClick={handleSearchRef} className="px-6 bg-blue-600 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-all">
                    BUSCAR
                  </button>`;
const newButtons = `<button onClick={handleSearchRef} className="px-6 bg-blue-600 text-white font-black text-sm rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center">
                    BUSCAR
                  </button>
                  <button onClick={handleMagicSearch} disabled={isAiSearching} className="px-6 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {isAiSearching ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                    BUSCA IA
                  </button>`;
content = content.replace(buttonAnchor, newButtons);

// Loading State in UI
content = content.replace(
  "{isSearchingRef ? (",
  "{(isSearchingRef || isAiSearching) ? ("
);

fs.writeFileSync(file, content);
console.log('Added Magic Search UI');
