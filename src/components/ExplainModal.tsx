import { useState } from 'react';
import { aiApi } from '@/lib/api';
import { X, Loader2, Lightbulb, TrendingUp } from 'lucide-react';

// ============================================
// TYPES
// ============================================
interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: string;
  value: string;
  context?: string; // contexto extra (dados do gráfico, DRE, etc.)
}

interface ExplainData {
  summary: string;
  details: string;
  recommendation: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

// ============================================
// SPARKLE ICON (matching wireframe)
// ============================================
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" />
      <path d="M5 16l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z" />
      <path d="M18 14l.7 1.3 1.3.7-1.3.7-.7 1.3-.7-1.3-1.3-.7 1.3-.7.7-1.3z" />
    </svg>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================
export default function ExplainModal({ isOpen, onClose, metric, value, context }: ExplainModalProps) {
  const [data, setData] = useState<ExplainData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasLoaded, setHasLoaded] = useState(false);

  // Fetch explanation when modal opens
  const fetchExplanation = async () => {
    if (hasLoaded && data) return; // Don't refetch if already loaded
    setIsLoading(true);
    setError('');
    try {
      const res = await aiApi.explain(metric, value, context);
      const result = res.data.data || res.data;
      setData({
        summary: result.summary || '',
        details: result.details || '',
        recommendation: result.recommendation || '',
        sentiment: result.sentiment || 'neutral',
      });
      setHasLoaded(true);
    } catch (err: any) {
      console.error('Erro ao buscar explicação:', err);
      setError('Não foi possível gerar a explicação. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger fetch when modal opens
  if (isOpen && !hasLoaded && !isLoading && !error) {
    fetchExplanation();
  }

  // Reset state when modal closes
  const handleClose = () => {
    setData(null);
    setHasLoaded(false);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* ===== HEADER — Gradiente azul/roxo ===== */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-violet-500 px-6 py-5 text-white relative">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <SparkleIcon className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-100 font-medium">Explica pra Mim</p>
              <h2 className="text-lg font-bold mt-0.5 leading-tight">
                {metric}: {value}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* ===== BODY ===== */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

          {/* Loading state */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
              <p className="text-sm font-medium text-slate-700">Analisando seus dados...</p>
              <p className="text-xs text-slate-400 mt-1">O CFO AI está gerando uma análise personalizada</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <button
                onClick={() => { setError(''); setHasLoaded(false); }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Data loaded */}
          {data && !isLoading && (
            <div className="space-y-4">
              {/* AI badge */}
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center">
                  <SparkleIcon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-slate-500">Análise gerada pelo CFO AI com base nos seus dados</span>
              </div>

              {/* ===== CARD 1: RESUMO ===== */}
              <div className="bg-slate-50 rounded-xl p-5 border-l-4 border-amber-400">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Resumo</h3>
                </div>
                <p className="text-[15px] leading-relaxed text-slate-800">{data.summary}</p>
              </div>

              {/* ===== CARD 2: ENTENDA MELHOR ===== */}
              <div className="bg-blue-50 rounded-xl p-5 border-l-4 border-blue-400">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-blue-500" />
                  <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wide">Entenda Melhor</h3>
                </div>
                <p className="text-[15px] leading-relaxed text-slate-700">{data.details}</p>
              </div>

              {/* ===== CARD 3: RECOMENDAÇÃO DO CFO AI ===== */}
              <div className="bg-emerald-50 rounded-xl p-5 border-l-4 border-emerald-400">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Recomendação do CFO AI</h3>
                </div>
                <p className="text-[15px] leading-relaxed text-slate-700">{data.recommendation}</p>
              </div>
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs text-slate-400">
            Dados atualizados em tempo real • Análise personalizada para sua empresa
          </p>
          <button
            onClick={handleClose}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// BOTÃO "EXPLICA PRA MIM" — Reutilizável
// Pode ser usado em qualquer lugar do sistema
// ============================================
interface ExplainButtonProps {
  metric: string;
  value: string;
  context?: string;
  variant?: 'icon' | 'button' | 'small';
  className?: string;
}

export function ExplainButton({ metric, value, context, variant = 'button', className = '' }: ExplainButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          className={`p-1.5 rounded-lg text-violet-500 hover:bg-violet-50 hover:text-violet-700 transition-colors ${className}`}
          title="Explica pra mim"
        >
          <SparkleIcon className="w-4 h-4" />
        </button>
        <ExplainModal isOpen={isOpen} onClose={() => setIsOpen(false)} metric={metric} value={value} context={context} />
      </>
    );
  }

  if (variant === 'small') {
    return (
      <>
        <button
          onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
          className={`inline-flex items-center gap-1 text-xs text-violet-500 hover:text-violet-700 font-medium transition-colors ${className}`}
          title="Explica pra mim"
        >
          <SparkleIcon className="w-3 h-3" />
          <span>Explica</span>
        </button>
        <ExplainModal isOpen={isOpen} onClose={() => setIsOpen(false)} metric={metric} value={value} context={context} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(true); }}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full border border-violet-300 text-violet-600 text-sm font-medium hover:bg-violet-50 transition-colors ${className}`}
      >
        <SparkleIcon className="w-4 h-4" />
        Explica pra mim
      </button>
      <ExplainModal isOpen={isOpen} onClose={() => setIsOpen(false)} metric={metric} value={value} context={context} />
    </>
  );
}
