/**
 * ReportPreview.tsx
 *
 * Componente de visualização do relatório gerado com dados reais.
 * Exibe cabeçalho da empresa, indicadores calculados e botão de exportar PDF.
 *
 * Caminho no projeto: client/src/components/ReportPreview.tsx
 *
 * UI: Tailwind CSS puro + Lucide icons (sem shadcn/ui)
 * API: usa api default de @/lib/api (axios com baseURL do Railway)
 */

import { useState, useRef, useCallback } from "react";
import {
  ArrowLeft,
  FileDown,
  Building2,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Loader2,
  Printer,
} from "lucide-react";
import api from "@/lib/api";

// ============================================
// TIPOS
// ============================================

interface CalculatedIndicator {
  id: string;
  name: string;
  value: string;
  rawValue: number | null;
  description: string;
  unit: string;
  available: boolean;
  unavailableReason?: string;
}

interface GeneratedReport {
  company: {
    name: string;
    cnpj: string;
    sector: string;
  };
  referenceMonth: string;
  monthLabel: string;
  generatedAt: string;
  indicators: CalculatedIndicator[];
}

interface ReportPreviewProps {
  report: GeneratedReport;
  onBack: () => void;
}

// ============================================
// HELPERS
// ============================================

function getValueColor(indicator: CalculatedIndicator): string {
  if (!indicator.available) return "text-gray-400";
  if (indicator.unit === "PERCENT" && indicator.rawValue !== null) {
    if (indicator.rawValue > 0) return "text-emerald-600";
    if (indicator.rawValue < 0) return "text-red-600";
  }
  if (indicator.unit === "BRL" && indicator.rawValue !== null) {
    if (indicator.id.includes("lucro") || indicator.id.includes("fluxo") || indicator.id.includes("saldo")) {
      if (indicator.rawValue < 0) return "text-red-600";
      if (indicator.rawValue > 0) return "text-emerald-600";
    }
  }
  return "text-gray-900";
}

function getValueIcon(indicator: CalculatedIndicator) {
  if (!indicator.available) return <AlertCircle className="h-4 w-4 text-gray-400" />;
  if (indicator.unit === "PERCENT" && indicator.rawValue !== null) {
    if (indicator.rawValue > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (indicator.rawValue < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  }
  return null;
}

function formatCNPJ(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
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
      className={`fixed top-5 right-5 z-[9999] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
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

export default function ReportPreview({ report, onBack }: ReportPreviewProps) {
  const toast = useSimpleToast();
  const [downloading, setDownloading] = useState(false);

  const generatedDate = new Date(report.generatedAt);
  const formattedDate = generatedDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const availableCount = report.indicators.filter((i) => i.available).length;
  const unavailableCount = report.indicators.filter((i) => !i.available).length;

  // ── Download PDF ──
  const downloadPDF = async () => {
    try {
      setDownloading(true);

      const res = await api.get(`/report/pdf?month=${report.referenceMonth}`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio-Financeiro-${report.company.name.replace(/\s+/g, "-")}-${report.referenceMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.show("PDF baixado com sucesso!", "success");
    } catch {
      toast.show("A exportação em PDF será disponibilizada em breve.", "info");
    } finally {
      setDownloading(false);
    }
  };

  // ── Imprimir ──
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {toast.ToastEl}

      {/* ── Barra de ações (não imprime) ── */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao editor
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Imprimir
          </button>
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors shadow-sm ${
              downloading
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Baixar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RELATÓRIO (área imprimível)
          ══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm print:shadow-none print:border-none">
        {/* ── Cabeçalho ── */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{report.company.name}</h1>
                {report.company.cnpj && (
                  <p className="text-sm text-gray-500">CNPJ: {formatCNPJ(report.company.cnpj)}</p>
                )}
                {report.company.sector && (
                  <p className="text-sm text-gray-500">Setor: {report.company.sector}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-semibold text-gray-900">Relatório Financeiro</h2>
              <div className="flex items-center gap-1.5 justify-end mt-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{report.monthLabel}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Resumo ── */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {availableCount} indicador(es) calculado(s)
            {unavailableCount > 0 && ` · ${unavailableCount} indisponível(is)`}
          </span>
          <span className="text-gray-400">Gerado em {formattedDate}</span>
        </div>

        {/* ── Indicadores ── */}
        <div className="p-8 space-y-0 divide-y divide-gray-100">
          {report.indicators.map((indicator) => (
            <div
              key={indicator.id}
              className={`py-4 first:pt-0 last:pb-0 ${!indicator.available ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{indicator.name}</h3>
                    {!indicator.available && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-amber-50 text-amber-600 border-amber-200">
                        Indisponível
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {indicator.description}
                  </p>
                  {!indicator.available && indicator.unavailableReason && (
                    <p className="text-xs text-amber-600 mt-1 italic">
                      {indicator.unavailableReason}
                    </p>
                  )}
                </div>

                {/* Valor */}
                <div className="flex items-center gap-2 shrink-0">
                  {getValueIcon(indicator)}
                  <span className={`text-xl font-bold tabular-nums ${getValueColor(indicator)}`}>
                    {indicator.value}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Rodapé ── */}
        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">
            Relatório gerado automaticamente pela plataforma Esnork · {report.monthLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
