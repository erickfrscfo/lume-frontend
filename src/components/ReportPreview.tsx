/**
 * ReportPreview.tsx
 * 
 * Componente de visualização do relatório gerado com dados reais.
 * Exibe cabeçalho da empresa, indicadores calculados e botão de exportar PDF.
 * 
 * Caminho no projeto: client/src/components/ReportPreview.tsx
 */

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

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
    logoUrl: string | null;
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
  if (!indicator.available) return "text-muted-foreground";
  if (indicator.unit === "PERCENT" && indicator.rawValue !== null) {
    if (indicator.rawValue > 0) return "text-emerald-600";
    if (indicator.rawValue < 0) return "text-red-600";
  }
  if (indicator.unit === "BRL" && indicator.rawValue !== null) {
    // Para lucro/fluxo, negativo = vermelho
    if (indicator.id.includes("lucro") || indicator.id.includes("fluxo") || indicator.id.includes("saldo")) {
      if (indicator.rawValue < 0) return "text-red-600";
      if (indicator.rawValue > 0) return "text-emerald-600";
    }
  }
  return "text-foreground";
}

function getValueIcon(indicator: CalculatedIndicator) {
  if (!indicator.available) return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  if (indicator.unit === "PERCENT" && indicator.rawValue !== null) {
    if (indicator.rawValue > 0) return <TrendingUp className="h-4 w-4 text-emerald-600" />;
    if (indicator.rawValue < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  return null;
}

function formatCNPJ(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj;
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

// ============================================
// COMPONENTE
// ============================================

export default function ReportPreview({ report, onBack }: ReportPreviewProps) {
  const { toast } = useToast();
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
      const res = await fetch(`/api/report/pdf?month=${report.referenceMonth}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!res.ok) throw new Error("Erro ao gerar PDF");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio-Financeiro-${report.company.name.replace(/\s+/g, "-")}-${report.referenceMonth}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: "PDF baixado", description: "O relatório foi exportado com sucesso." });
    } catch (error) {
      toast({
        title: "Erro ao exportar PDF",
        description: "A exportação em PDF será disponibilizada em breve.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // ── Imprimir ──
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* ── Barra de ações (não imprime) ── */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar ao editor
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={downloadPDF} disabled={downloading} className="gap-2">
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
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RELATÓRIO (área imprimível)
          ══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border shadow-sm print:shadow-none print:border-none">
        {/* ── Cabeçalho ── */}
        <div className="p-8 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {report.company.logoUrl ? (
                <img
                  src={report.company.logoUrl}
                  alt={report.company.name}
                  className="h-14 w-14 rounded-lg object-contain border"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-7 w-7 text-primary" />
                </div>
              )}
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
        <div className="px-8 py-4 bg-gray-50/50 border-b flex items-center justify-between text-sm">
          <span className="text-gray-500">
            {availableCount} indicador(es) calculado(s)
            {unavailableCount > 0 && ` · ${unavailableCount} indisponível(is)`}
          </span>
          <span className="text-gray-400">Gerado em {formattedDate}</span>
        </div>

        {/* ── Indicadores ── */}
        <div className="p-8 space-y-4">
          {report.indicators.map((indicator, index) => (
            <div key={indicator.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className={`${!indicator.available ? "opacity-60" : ""}`}>
                {/* Linha do indicador */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{indicator.name}</h3>
                      {!indicator.available && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                          Indisponível
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {indicator.description}
                    </p>
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
            </div>
          ))}
        </div>

        {/* ── Rodapé ── */}
        <div className="px-8 py-4 border-t bg-gray-50/50 text-center">
          <p className="text-xs text-gray-400">
            Relatório gerado automaticamente pela plataforma Esnork · {report.monthLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
