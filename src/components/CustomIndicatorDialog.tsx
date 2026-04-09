/**
 * CustomIndicatorDialog.tsx
 *
 * Dialog (modal) para criar indicadores customizados via IA.
 * O usuário descreve o indicador em linguagem natural, a IA interpreta
 * e sugere nome, fórmula e texto explicativo.
 *
 * Caminho no projeto: client/src/components/CustomIndicatorDialog.tsx
 *
 * UI: Tailwind CSS puro + Lucide icons (sem shadcn/ui)
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Sparkles,
  Loader2,
  X,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// ============================================
// TIPOS
// ============================================

interface CustomIndicatorData {
  id: string;
  name: string;
  description: string;
  formula: string;
  category: string;
  unit: string;
}

interface AISuggestion {
  name: string;
  description: string;
  formula: string;
  viable: boolean;
  viabilityNote?: string;
}

interface CustomIndicatorDialogProps {
  onClose: () => void;
  onCreated: (indicator: CustomIndicatorData) => void;
}

// ============================================
// TOAST SIMPLES
// ============================================

function useSimpleToast() {
  const [msg, setMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string, type: "success" | "error" | "info" = "info") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMsg({ text, type });
    timerRef.current = setTimeout(() => setMsg(null), 3500);
  }, []);

  const ToastEl = msg ? (
    <div
      className={`fixed top-5 right-5 z-[10000] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
        msg.type === "success" ? "bg-emerald-600" : msg.type === "error" ? "bg-red-600" : "bg-blue-600"
      }`}
    >
      {msg.text}
    </div>
  ) : null;

  return { show, ToastEl };
}

// ============================================
// COMPONENTE
// ============================================

export default function CustomIndicatorDialog({
  onClose,
  onCreated,
}: CustomIndicatorDialogProps) {
  const toast = useSimpleToast();

  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [notViableMessage, setNotViableMessage] = useState<string | null>(null);

  const backdropRef = useRef<HTMLDivElement>(null);

  // Fechar ao clicar no backdrop
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Fechar com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // ── Enviar descrição para a IA ──
  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 5) {
      toast.show("Descreva com mais detalhes o indicador que deseja criar.", "error");
      return;
    }

    try {
      setLoading(true);
      setSuggestion(null);
      setNotViableMessage(null);

      const token = localStorage.getItem("token");
      const res = await fetch("/api/report/indicators/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar");
      }

      if (data.success === false) {
        // IA disse que não é viável
        setNotViableMessage(data.message || "Este indicador não pode ser calculado com os dados disponíveis.");
        setSuggestion(data.suggestion || null);
      } else if (data.success === true) {
        // Indicador criado com sucesso — já foi salvo no banco
        onCreated(data.indicator);
        resetState();
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Não foi possível criar o indicador. Tente novamente.";
      toast.show(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Resetar estado ──
  const resetState = () => {
    setDescription("");
    setSuggestion(null);
    setNotViableMessage(null);
  };

  // ── Refazer ──
  const handleRetry = () => {
    setSuggestion(null);
    setNotViableMessage(null);
  };

  const EXAMPLES = [
    "Quanto gastei com marketing no mês",
    "Proporção de custos fixos vs variáveis",
    "Receita média por cliente",
    "Total de multas pagas",
  ];

  return (
    <>
      {toast.ToastEl}

      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleBackdropClick}
        className="fixed inset-0 z-[9998] bg-black/50 flex items-center justify-center p-4"
      >
        {/* Modal */}
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Criar Indicador com IA
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Descreva o indicador que deseja e a IA vai interpretá-lo e criá-lo para você.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* ── Campo de descrição ── */}
            {!notViableMessage && (
              <>
                <textarea
                  placeholder="Ex: Quero ver quanto gastei com marketing em relação à receita total..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={loading}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                />

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Mín. 5 caracteres · Máx. 20 indicadores por empresa
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || description.trim().length < 5}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      loading || description.trim().length < 5
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Criar
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {/* ── Mensagem de não viável ── */}
            {notViableMessage && (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Indicador não disponível
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {notViableMessage}
                    </p>
                  </div>
                </div>

                {suggestion && (
                  <div className="bg-white rounded-lg p-3 border border-amber-200">
                    <p className="text-xs text-gray-500 mb-1">Sugestão da IA:</p>
                    <p className="text-sm font-medium text-gray-900">{suggestion.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{suggestion.description}</p>
                  </div>
                )}

                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Tentar outro
                </button>
              </div>
            )}

            {/* ── Exemplos ── */}
            {!loading && !notViableMessage && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500">Exemplos de indicadores:</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map((example) => (
                    <button
                      key={example}
                      onClick={() => setDescription(example)}
                      className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
