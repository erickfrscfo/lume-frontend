import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck, UserPlus, Building2, CheckCircle2, XCircle, Copy,
  ArrowLeft, Loader2, BookOpen, Plus, Trash2, ChevronDown, ChevronRight,
  RotateCcw, Pencil, X, Check
} from 'lucide-react';

// ============================================================
// PLANO DE CONTAS PADRÃO (espelho do seed.ts)
// ============================================================
interface CategoryItem {
  code: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  parentCode: string | null;
  isActive: boolean;
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  // RECEITAS
  { code: "1.0", name: "Receita Operacional", type: "INCOME", parentCode: null, isActive: true },
  { code: "1.1", name: "Venda de Produtos", type: "INCOME", parentCode: "1.0", isActive: true },
  { code: "1.2", name: "Prestação de Serviços", type: "INCOME", parentCode: "1.0", isActive: true },
  { code: "1.3", name: "Assinaturas/Recorrência", type: "INCOME", parentCode: "1.0", isActive: true },
  { code: "1.4", name: "Comissões Recebidas", type: "INCOME", parentCode: "1.0", isActive: true },
  { code: "2.0", name: "Receita Não Operacional", type: "INCOME", parentCode: null, isActive: true },
  { code: "2.1", name: "Rendimentos Financeiros", type: "INCOME", parentCode: "2.0", isActive: true },
  { code: "2.2", name: "Aluguéis Recebidos", type: "INCOME", parentCode: "2.0", isActive: true },
  { code: "2.3", name: "Venda de Ativos", type: "INCOME", parentCode: "2.0", isActive: true },
  { code: "2.4", name: "Empréstimos Recebidos", type: "INCOME", parentCode: "2.0", isActive: true },
  { code: "2.5", name: "Outras Receitas", type: "INCOME", parentCode: "2.0", isActive: true },
  // CUSTOS DIRETOS
  { code: "3.0", name: "Custos Diretos", type: "EXPENSE", parentCode: null, isActive: true },
  { code: "3.1", name: "Matéria-Prima", type: "EXPENSE", parentCode: "3.0", isActive: true },
  { code: "3.2", name: "Mercadoria para Revenda", type: "EXPENSE", parentCode: "3.0", isActive: true },
  { code: "3.3", name: "Mão de Obra Direta", type: "EXPENSE", parentCode: "3.0", isActive: true },
  { code: "3.4", name: "Frete sobre Vendas", type: "EXPENSE", parentCode: "3.0", isActive: true },
  { code: "3.5", name: "Embalagens", type: "EXPENSE", parentCode: "3.0", isActive: true },
  { code: "3.6", name: "Serviços de Terceiros (Produção)", type: "EXPENSE", parentCode: "3.0", isActive: true },
  // DESPESAS COM PESSOAL
  { code: "4.0", name: "Despesas com Pessoal", type: "EXPENSE", parentCode: null, isActive: true },
  { code: "4.1", name: "Salários e Pró-Labore", type: "EXPENSE", parentCode: "4.0", isActive: true },
  { code: "4.2", name: "Encargos Trabalhistas", type: "EXPENSE", parentCode: "4.0", isActive: true },
  { code: "4.3", name: "Benefícios", type: "EXPENSE", parentCode: "4.0", isActive: true },
  { code: "4.4", name: "Prestadores PJ", type: "EXPENSE", parentCode: "4.0", isActive: true },
  { code: "4.5", name: "Treinamento e Capacitação", type: "EXPENSE", parentCode: "4.0", isActive: true },
  { code: "4.6", name: "INSS Patronal", type: "EXPENSE", parentCode: "4.0", isActive: true },
  // DESPESAS OPERACIONAIS
  { code: "5.0", name: "Despesas Operacionais", type: "EXPENSE", parentCode: null, isActive: true },
  { code: "5.1", name: "Aluguel e Condomínio", type: "EXPENSE", parentCode: "5.0", isActive: true },
  { code: "5.2", name: "Energia e Água", type: "EXPENSE", parentCode: "5.0", isActive: true },
  { code: "5.3", name: "Telecomunicações", type: "EXPENSE", parentCode: "5.0", isActive: true },
  { code: "5.4", name: "Software e Assinaturas", type: "EXPENSE", parentCode: "5.0", isActive: true },
  { code: "5.5", name: "Material de Escritório", type: "EXPENSE", parentCode: "5.0", isActive: true },
  { code: "5.6", name: "Manutenção e Reparos", type: "EXPENSE", parentCode: "5.0", isActive: true },
  { code: "5.7", name: "Seguros", type: "EXPENSE", parentCode: "5.0", isActive: true },
  { code: "5.8", name: "Transporte e Deslocamento", type: "EXPENSE", parentCode: "5.0", isActive: true },
  // DESPESAS COMERCIAIS
  { code: "6.0", name: "Despesas Comerciais", type: "EXPENSE", parentCode: null, isActive: true },
  { code: "6.1", name: "Marketing Digital", type: "EXPENSE", parentCode: "6.0", isActive: true },
  { code: "6.2", name: "Marketing Offline", type: "EXPENSE", parentCode: "6.0", isActive: true },
  { code: "6.3", name: "Comissões de Vendas", type: "EXPENSE", parentCode: "6.0", isActive: true },
  { code: "6.4", name: "Ferramentas de Vendas", type: "EXPENSE", parentCode: "6.0", isActive: true },
  { code: "6.5", name: "Brindes e Amostras", type: "EXPENSE", parentCode: "6.0", isActive: true },
  // DESPESAS FINANCEIRAS
  { code: "7.0", name: "Despesas Financeiras", type: "EXPENSE", parentCode: null, isActive: true },
  { code: "7.1", name: "Juros de Empréstimos", type: "EXPENSE", parentCode: "7.0", isActive: true },
  { code: "7.2", name: "Tarifas Bancárias", type: "EXPENSE", parentCode: "7.0", isActive: true },
  { code: "7.3", name: "Taxas de Cartão/Maquininha", type: "EXPENSE", parentCode: "7.0", isActive: true },
  { code: "7.4", name: "Multas e Juros Pagos", type: "EXPENSE", parentCode: "7.0", isActive: true },
  { code: "7.5", name: "IOF e Encargos", type: "EXPENSE", parentCode: "7.0", isActive: true },
  // IMPOSTOS
  { code: "8.0", name: "Impostos e Tributos", type: "EXPENSE", parentCode: null, isActive: true },
  { code: "8.1", name: "Simples Nacional / DAS", type: "EXPENSE", parentCode: "8.0", isActive: true },
  { code: "8.2", name: "ISS", type: "EXPENSE", parentCode: "8.0", isActive: true },
  { code: "8.3", name: "ICMS", type: "EXPENSE", parentCode: "8.0", isActive: true },
  { code: "8.4", name: "PIS/COFINS", type: "EXPENSE", parentCode: "8.0", isActive: true },
  { code: "8.5", name: "IRPJ/CSLL", type: "EXPENSE", parentCode: "8.0", isActive: true },
  { code: "8.7", name: "Outros Tributos", type: "EXPENSE", parentCode: "8.0", isActive: true },
  // INVESTIMENTOS
  { code: "9.0", name: "Investimentos (Capex)", type: "EXPENSE", parentCode: null, isActive: true },
  { code: "9.1", name: "Equipamentos e Máquinas", type: "EXPENSE", parentCode: "9.0", isActive: true },
  { code: "9.2", name: "Móveis e Utensílios", type: "EXPENSE", parentCode: "9.0", isActive: true },
  { code: "9.3", name: "Veículos", type: "EXPENSE", parentCode: "9.0", isActive: true },
  { code: "9.4", name: "Desenvolvimento de Software", type: "EXPENSE", parentCode: "9.0", isActive: true },
  { code: "9.5", name: "Obras e Reformas", type: "EXPENSE", parentCode: "9.0", isActive: true },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function AdminOnboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const keyFromUrl = searchParams.get('key') || '';

  // Auth state
  const [isValidating, setIsValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [copied, setCopied] = useState('');

  // Form fields — Usuário
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Form fields — Empresa
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [sector, setSector] = useState('');
  const [activity, setActivity] = useState('');
  const [useCustomChart, setUseCustomChart] = useState(false);

  // Plano de contas customizado
  const [categories, setCategories] = useState<CategoryItem[]>(() =>
    DEFAULT_CATEGORIES.map(c => ({ ...c }))
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');

  // Valida a chave contra o backend ao carregar a página
  useEffect(() => {
    if (!keyFromUrl) {
      setIsValidating(false);
      setIsAuthorized(false);
      return;
    }

    const validateKey = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/auth/validate-admin-key`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Key': keyFromUrl,
          },
        });
        setIsAuthorized(res.ok);
      } catch {
        setIsAuthorized(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateKey();
  }, [keyFromUrl]);

  // Grupos (categorias pai) e filhos
  const groupedCategories = useMemo(() => {
    const groups = categories.filter(c => c.parentCode === null);
    return groups.map(group => ({
      ...group,
      children: categories.filter(c => c.parentCode === group.code),
    }));
  }, [categories]);

  const activeCount = useMemo(() => categories.filter(c => c.isActive).length, [categories]);
  const inactiveCount = useMemo(() => categories.filter(c => !c.isActive).length, [categories]);

  // ---- Ações do editor de plano de contas ----

  const toggleGroup = (code: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleActive = (code: string) => {
    setCategories(prev => prev.map(c => {
      if (c.code === code) return { ...c, isActive: !c.isActive };
      // Se desativar um grupo pai, desativa os filhos também
      if (c.parentCode === code) {
        const parent = prev.find(p => p.code === code);
        if (parent && parent.isActive) return { ...c, isActive: false };
      }
      return c;
    }));
  };

  const startEditing = (code: string, currentName: string) => {
    setEditingCode(code);
    setEditingName(currentName);
  };

  const saveEditing = () => {
    if (!editingCode || !editingName.trim()) return;
    setCategories(prev => prev.map(c =>
      c.code === editingCode ? { ...c, name: editingName.trim() } : c
    ));
    setEditingCode(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingCode(null);
    setEditingName('');
  };

  const removeCategory = (code: string) => {
    setCategories(prev => prev.filter(c => c.code !== code && c.parentCode !== code));
  };

  const startAddingToGroup = (groupCode: string) => {
    setAddingToGroup(groupCode);
    setNewCatName('');
  };

  const confirmAddToGroup = () => {
    if (!addingToGroup || !newCatName.trim()) return;

    const group = categories.find(c => c.code === addingToGroup);
    if (!group) return;

    // Calcular próximo código
    const siblings = categories.filter(c => c.parentCode === addingToGroup);
    const groupPrefix = addingToGroup.split('.')[0];
    let nextNum = siblings.length + 1;

    // Evitar colisão
    while (categories.some(c => c.code === `${groupPrefix}.${nextNum}`)) {
      nextNum++;
    }

    const newCode = `${groupPrefix}.${nextNum}`;

    setCategories(prev => [...prev, {
      code: newCode,
      name: newCatName.trim(),
      type: group.type,
      parentCode: addingToGroup,
      isActive: true,
    }]);

    setAddingToGroup(null);
    setNewCatName('');
  };

  const addNewGroup = (type: 'INCOME' | 'EXPENSE') => {
    const existingGroups = categories.filter(c => c.parentCode === null);
    let nextGroupNum = existingGroups.length + 1;

    // Evitar colisão
    while (categories.some(c => c.code === `${nextGroupNum}.0`)) {
      nextGroupNum++;
    }

    const newCode = `${nextGroupNum}.0`;
    const defaultName = type === 'INCOME' ? 'Nova Receita' : 'Nova Despesa';

    setCategories(prev => [...prev, {
      code: newCode,
      name: defaultName,
      type,
      parentCode: null,
      isActive: true,
    }]);

    // Já abre em modo de edição
    setTimeout(() => startEditing(newCode, defaultName), 50);
  };

  const resetToDefault = () => {
    setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c })));
    setCollapsedGroups(new Set());
    setEditingCode(null);
    setAddingToGroup(null);
  };

  // ---- Submit ----

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';

      // Preparar categorias customizadas (só as ativas)
      const customCategories = useCustomChart
        ? categories.filter(c => c.isActive).map(c => ({
            code: c.code,
            name: c.name,
            type: c.type,
            parentCode: c.parentCode,
          }))
        : undefined;

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': keyFromUrl,
        },
        body: JSON.stringify({
          name,
          username,
          email,
          password,
          company: {
            name: companyName,
            cnpj: cnpj.replace(/\D/g, ''),
            sector,
            activity: activity.trim() || undefined,
            useCustomChart,
            customCategories,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar conta.');
      }

      setSuccess(data.data);
      // Limpa o formulário
      setName(''); setUsername(''); setEmail(''); setPassword('');
      setCompanyName(''); setCnpj(''); setSector(''); setActivity('');
      setUseCustomChart(false);
      setCategories(DEFAULT_CATEGORIES.map(c => ({ ...c })));
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };

  // ---- Telas de loading / acesso negado ----

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Validando acesso...</h2>
          <p className="text-slate-500 text-sm">Verificando chave de administrador.</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acesso Negado</h2>
          <p className="text-slate-500 text-sm mb-6">
            {!keyFromUrl
              ? 'Esta página requer uma chave de administrador válida na URL.'
              : 'A chave de administrador fornecida é inválida.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  // ---- Formulário principal ----

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-8 px-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-slate-900">Admin Onboarding</span>
          </div>
          <p className="text-slate-500">Criar nova empresa e usuário no Esnorke</p>
        </div>

        {/* Success Card */}
        {success && (
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 p-8 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-green-800">Conta criada com sucesso!</h3>
            </div>

            <div className="bg-green-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700 mb-2">Credenciais para o cliente:</p>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Usuário:</span>
                  <p className="text-sm font-mono font-medium text-slate-900">{success.user?.username}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(success.user?.username || '', 'username')}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {copied === 'username' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Código da Empresa:</span>
                  <p className="text-sm font-mono font-medium text-slate-900">{success.company?.code}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(success.company?.code || '', 'code')}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                >
                  {copied === 'code' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {success.company?.useCustomChart && (
                <div className="pt-2 border-t border-green-200">
                  <p className="text-xs text-amber-700 font-medium">
                    Plano de contas customizado ativado com {success.company?.customCategoriesCount || '—'} categorias.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-slate-500">
                  A senha inicial é a que você definiu no formulário. O usuário pode alterá-la após o primeiro login.
                </p>
              </div>
            </div>

            <button
              onClick={() => setSuccess(null)}
              className="mt-4 w-full py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-all text-sm"
            >
              Criar outra conta
            </button>
          </div>
        )}

        {/* Form Card */}
        {!success && (
          <form onSubmit={handleSubmit}>
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Card: Dados do Usuário */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-4">
              <div className="flex items-center gap-2 mb-5">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Dados do Usuário</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="João Silva" required
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Usuário</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="joao_silva" required
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@empresa.com" required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha Inicial</label>
                  <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <p className="text-xs text-slate-400 mt-1">O usuário poderá alterar a senha após o primeiro login</p>
                </div>
              </div>
            </div>

            {/* Card: Dados da Empresa */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-4">
              <div className="flex items-center gap-2 mb-5">
                <Building2 className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Dados da Empresa</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Razão Social</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Empresa Ltda" required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ</label>
                    <input type="text" value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" required
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Setor</label>
                    <select value={sector} onChange={e => setSector(e.target.value)} required
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                      <option value="">Selecione...</option>
                      <option value="VAREJO">Varejo / Comércio</option>
                      <option value="SERVICOS">Serviços / Consultoria</option>
                      <option value="INDUSTRIA">Indústria / Manufatura</option>
                      <option value="SAAS">SaaS / Tecnologia</option>
                      <option value="ECOMMERCE">E-commerce</option>
                      <option value="MISTO">Misto / Outros</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Atividade Principal</label>
                  <input type="text" value={activity} onChange={e => setActivity(e.target.value)}
                    placeholder="Ex: consultoria tributária, varejo de moda, desenvolvimento de software..."
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  <p className="text-xs text-slate-400 mt-1">Opcional — ajuda a IA a classificar transações com mais precisão</p>
                </div>
              </div>
            </div>

            {/* Card: Plano de Contas */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 mb-4">
              <div className="flex items-center gap-2 mb-5">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Plano de Contas</p>
              </div>

              {/* Toggle */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" checked={useCustomChart} onChange={e => setUseCustomChart(e.target.checked)} className="sr-only peer" />
                    <div className="w-10 h-5 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform"></div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-700">Usar plano de contas customizado</span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {useCustomChart
                        ? 'Edite o plano abaixo antes de criar a empresa. Somente categorias ativas serão salvas.'
                        : 'Será usado o plano de contas padrão global.'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Editor de categorias (só aparece quando toggle ON) */}
              {useCustomChart && (
                <div className="space-y-3">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-400"></span>
                        {activeCount} ativas
                      </span>
                      {inactiveCount > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                          {inactiveCount} inativas
                        </span>
                      )}
                    </div>
                    <button type="button" onClick={resetToDefault}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors">
                      <RotateCcw className="w-3 h-3" />
                      Resetar para padrão
                    </button>
                  </div>

                  {/* Lista de grupos */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {groupedCategories.map(group => {
                      const isCollapsed = collapsedGroups.has(group.code);
                      const isEditing = editingCode === group.code;
                      const isAdding = addingToGroup === group.code;
                      const activeChildren = group.children.filter(c => c.isActive).length;

                      return (
                        <div key={group.code}>
                          {/* Grupo pai */}
                          <div className={`flex items-center gap-2 px-3 py-2.5 ${group.isActive ? 'bg-slate-50' : 'bg-slate-100 opacity-60'}`}>
                            <button type="button" onClick={() => toggleGroup(group.code)} className="text-slate-400 hover:text-slate-600">
                              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                              group.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {group.code}
                            </span>

                            {isEditing ? (
                              <div className="flex-1 flex items-center gap-1">
                                <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }}
                                  autoFocus
                                  className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                <button type="button" onClick={saveEditing} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                <button type="button" onClick={cancelEditing} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <span className="flex-1 text-sm font-medium text-slate-800">{group.name}</span>
                            )}

                            <span className="text-xs text-slate-400">{activeChildren}/{group.children.length}</span>

                            <div className="flex items-center gap-1">
                              {!isEditing && (
                                <button type="button" onClick={() => startEditing(group.code, group.name)}
                                  className="text-slate-300 hover:text-blue-500 transition-colors" title="Renomear">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button type="button" onClick={() => toggleActive(group.code)}
                                className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                  group.isActive ? 'text-green-600 hover:bg-green-100' : 'text-slate-400 hover:bg-slate-200'
                                }`} title={group.isActive ? 'Desativar grupo' : 'Ativar grupo'}>
                                {group.isActive ? 'ON' : 'OFF'}
                              </button>
                              <button type="button" onClick={() => removeCategory(group.code)}
                                className="text-slate-300 hover:text-red-500 transition-colors" title="Remover grupo">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Filhos */}
                          {!isCollapsed && (
                            <div className="divide-y divide-slate-50">
                              {group.children.map(child => {
                                const isChildEditing = editingCode === child.code;

                                return (
                                  <div key={child.code}
                                    className={`flex items-center gap-2 pl-10 pr-3 py-2 ${child.isActive ? '' : 'opacity-40'}`}>
                                    <span className="text-xs font-mono text-slate-400 w-8">{child.code}</span>

                                    {isChildEditing ? (
                                      <div className="flex-1 flex items-center gap-1">
                                        <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)}
                                          onKeyDown={e => { if (e.key === 'Enter') saveEditing(); if (e.key === 'Escape') cancelEditing(); }}
                                          autoFocus
                                          className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                        <button type="button" onClick={saveEditing} className="text-green-600 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
                                        <button type="button" onClick={cancelEditing} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                      </div>
                                    ) : (
                                      <span className="flex-1 text-sm text-slate-700">{child.name}</span>
                                    )}

                                    <div className="flex items-center gap-1">
                                      {!isChildEditing && (
                                        <button type="button" onClick={() => startEditing(child.code, child.name)}
                                          className="text-slate-300 hover:text-blue-500 transition-colors" title="Renomear">
                                          <Pencil className="w-3 h-3" />
                                        </button>
                                      )}
                                      <button type="button" onClick={() => toggleActive(child.code)}
                                        className={`text-xs px-1.5 py-0.5 rounded transition-colors ${
                                          child.isActive ? 'text-green-600 hover:bg-green-100' : 'text-slate-400 hover:bg-slate-200'
                                        }`}>
                                        {child.isActive ? 'ON' : 'OFF'}
                                      </button>
                                      <button type="button" onClick={() => removeCategory(child.code)}
                                        className="text-slate-300 hover:text-red-500 transition-colors" title="Remover">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Adicionar subcategoria */}
                              {isAdding ? (
                                <div className="flex items-center gap-2 pl-10 pr-3 py-2 bg-blue-50">
                                  <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); confirmAddToGroup(); } if (e.key === 'Escape') setAddingToGroup(null); }}
                                    placeholder="Nome da subcategoria"
                                    autoFocus
                                    className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                                  <button type="button" onClick={confirmAddToGroup} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                                  <button type="button" onClick={() => setAddingToGroup(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => startAddingToGroup(group.code)}
                                  className="flex items-center gap-1 pl-10 pr-3 py-1.5 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50 w-full transition-colors">
                                  <Plus className="w-3 h-3" />
                                  Adicionar subcategoria
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Botões para adicionar novo grupo */}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => addNewGroup('INCOME')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 border border-dashed border-green-300 text-green-600 text-xs font-medium rounded-lg hover:bg-green-50 transition-colors">
                      <Plus className="w-3 h-3" />
                      Novo grupo de Receita
                    </button>
                    <button type="button" onClick={() => addNewGroup('EXPENSE')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 border border-dashed border-red-300 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors">
                      <Plus className="w-3 h-3" />
                      Novo grupo de Despesa
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-xl shadow-lg transition-all disabled:opacity-50 text-sm">
              {isLoading ? 'Criando conta...' : 'Criar Empresa e Usuário'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <button onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  );
}
