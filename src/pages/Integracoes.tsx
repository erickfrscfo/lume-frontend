import { useState } from 'react';
import {
  Link2, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  Shield, RefreshCw, ExternalLink, Zap
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  logo: string;
  description: string;
  connected: boolean;
  features: string[];
  color: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'omie',
    name: 'Omie',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Omie_logo.svg/1200px-Omie_logo.svg.png',
    description: 'ERP completo para gestão financeira, fiscal e contábil',
    connected: false,
    features: [
      'Sincronização automática de contas a pagar/receber',
      'Importação de notas fiscais',
      'Conciliação bancária automática',
      'Relatórios contábeis integrados',
    ],
    color: '#FF6B00',
  },
  {
    id: 'contaazul',
    name: 'Conta Azul',
    logo: 'https://contaazul.com/assets/images/logo-contaazul.svg',
    description: 'Plataforma de gestão financeira para pequenas empresas',
    connected: false,
    features: [
      'Importação de extratos bancários',
      'Sincronização de clientes e fornecedores',
      'Fluxo de caixa automático',
      'Emissão de boletos integrada',
    ],
    color: '#0066CC',
  },
];

export default function Integracoes() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleConnect = async (id: string) => {
    setConnecting(id);
    // Simular conexão (em produção seria OAuth flow)
    setTimeout(() => {
      setIntegrations(prev =>
        prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i)
      );
      setConnecting(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Integrações</h2>
        <p className="text-sm text-slate-500 mt-1">Conecte suas ferramentas contábeis para importação automática</p>
      </div>

      {/* Security Notice */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-800">Conexão Segura</p>
          <p className="text-xs text-emerald-600 mt-1">
            Todas as integrações utilizam OAuth 2.0 e criptografia de ponta a ponta. Seus dados nunca são compartilhados com terceiros.
          </p>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 p-2">
                <img
                  src={integration.logo}
                  alt={integration.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-bold" style="color: ${integration.color}">${integration.name[0]}</span>`;
                  }}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{integration.name}</h3>
                  {integration.connected && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Conectado
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-0.5">{integration.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleConnect(integration.id)}
                  disabled={connecting === integration.id}
                  className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    integration.connected
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  } disabled:opacity-50`}
                >
                  {connecting === integration.id
                    ? 'Conectando...'
                    : integration.connected
                    ? 'Desconectar'
                    : 'Conectar'}
                </button>
                <button
                  onClick={() => toggleExpand(integration.id)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  {expandedId === integration.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Expanded Features */}
            {expandedId === integration.id && (
              <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-3">Funcionalidades disponíveis:</p>
                <div className="grid grid-cols-2 gap-2">
                  {integration.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                      <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700">{feature}</span>
                    </div>
                  ))}
                </div>
                {integration.connected && (
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Sincronização automática a cada 6 horas
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      Criptografia AES-256
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Other Tools */}
      <div className="text-center py-4">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
          Utilizo outra ferramenta contábil →
        </button>
        <p className="text-xs text-slate-400 mt-1">
          Estamos constantemente adicionando novas integrações
        </p>
      </div>
    </div>
  );
}
