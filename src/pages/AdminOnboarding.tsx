import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, UserPlus, Building2, CheckCircle2, XCircle, Copy, ArrowLeft, Loader2, BookOpen } from 'lucide-react';

export default function AdminOnboarding() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const keyFromUrl = searchParams.get('key') || '';

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

        if (res.ok) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch {
        setIsAuthorized(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateKey();
  }, [keyFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(null);
    setIsLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
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
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar conta.');
      }

      setSuccess(data.data);
      // Limpa o formulário
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setCompanyName('');
      setCnpj('');
      setSector('');
      setActivity('');
      setUseCustomChart(false);
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

  // Tela de carregamento enquanto valida a chave
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

  // Tela de acesso negado (sem chave ou chave inválida)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
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
                  <p className="text-sm font-mono font-medium text-slate-900">{success.user?.username || username}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(success.user?.username || username, 'username')}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                  title="Copiar"
                >
                  {copied === 'username' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Código da Empresa:</span>
                  <p className="text-sm font-mono font-medium text-slate-900">{success.company?.code || '—'}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(success.company?.code || '', 'code')}
                  className="text-slate-400 hover:text-blue-600 transition-colors"
                  title="Copiar"
                >
                  {copied === 'code' ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {success.company?.useCustomChart && (
                <div className="pt-2 border-t border-green-200">
                  <p className="text-xs text-amber-700 font-medium">
                    Plano de contas customizado ativado. O plano padrão do setor foi copiado como base.
                    Acesse a tela de configuração para personalizar.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-slate-500">
                  A senha inicial é a que você definiu no formulário. O usuário pode alterá-la na tela de login.
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
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Seção: Dados do Usuário */}
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Dados do Usuário</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="João Silva"
                    required
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Usuário</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="joao_silva"
                    required
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@empresa.com"
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha Inicial</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">O usuário poderá alterar a senha após o primeiro login</p>
              </div>

              <hr className="border-slate-200" />

              {/* Seção: Dados da Empresa */}
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Dados da Empresa</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Razão Social</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Empresa Ltda"
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    required
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Setor</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                  >
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
                <input
                  type="text"
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  placeholder="Ex: consultoria tributária, varejo de moda, desenvolvimento de software..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">Opcional — ajuda a IA a classificar transações com mais precisão</p>
              </div>

              <hr className="border-slate-200" />

              {/* Seção: Plano de Contas */}
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Plano de Contas</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={useCustomChart}
                          onChange={(e) => setUseCustomChart(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-5 bg-slate-300 rounded-full peer-checked:bg-blue-600 transition-colors"></div>
                        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-5 transition-transform"></div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700">
                          Usar plano de contas customizado
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {useCustomChart
                            ? 'O plano padrão do setor será copiado como base. Você poderá personalizar depois na tela de configuração.'
                            : 'Será usado o plano de contas padrão do setor selecionado.'}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium py-3 rounded-lg transition-all disabled:opacity-50 text-sm"
              >
                {isLoading ? 'Criando conta...' : 'Criar Empresa e Usuário'}
              </button>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para o login
          </button>
        </div>
      </div>
    </div>
  );
}
