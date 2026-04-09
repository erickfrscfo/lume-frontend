/**
 * ReportBuilder.tsx
 * 
 * Tela principal "Monte seu Relatório" — permite ao usuário selecionar indicadores
 * de uma lista suspensa por categoria, reordená-los com setas, visualizar com dados
 * reais e exportar em PDF.
 * 
 * Caminho no projeto: client/src/pages/ReportBuilder.tsx
 * 
 * Observações do usuário:
 * 1. Lista suspensa para selecionar a categoria de indicadores (não exibir tudo de uma vez)
 * 2. Setas para cima/baixo em vez de drag & drop
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Eye,
  FileDown,
  Sparkles,
  ChevronRight,
  LayoutList,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import ReportPreview from "@/components/ReportPreview";
import CustomIndicatorDialog from "@/components/CustomIndicatorDialog";

// ============================================
// TIPOS
// ============================================

interface Indicator {
  id: string;
  name: string;
  description: string;
  unit: string;
  category: string;
}

interface CategoryGroup {
  key: string;
  label: string;
  description: string;
  indicators: Indicator[];
}

interface SelectedIndicator {
  id: string;
  type: "standard" | "custom";
  order: number;
}

interface CustomIndicatorData {
  id: string;
  name: string;
  description: string;
  formula: string;
  category: string;
  unit: string;
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
  indicators: Array<{
    id: string;
    name: string;
    value: string;
    rawValue: number | null;
    description: string;
    unit: string;
    available: boolean;
    unavailableReason?: string;
  }>;
}

// ============================================
// HELPERS
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
  RENTABILIDADE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CUSTOS: "bg-red-100 text-red-800 border-red-200",
  FLUXO_CAIXA: "bg-blue-100 text-blue-800 border-blue-200",
  FORNECEDORES_CLIENTES: "bg-amber-100 text-amber-800 border-amber-200",
  OPERACAO: "bg-purple-100 text-purple-800 border-purple-200",
  CUSTOM: "bg-slate-100 text-slate-800 border-slate-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  RENTABILIDADE: "Rentabilidade",
  CUSTOS: "Estrutura de Custos",
  FLUXO_CAIXA: "Fluxo de Caixa",
  FORNECEDORES_CLIENTES: "Fornecedores e Clientes",
  OPERACAO: "Operação e Tendência",
  CUSTOM: "Customizados",
};

function getMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  // Últimos 12 meses (excluindo o mês atual)
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ReportBuilder() {
  const { toast } = useToast();

  // Estado: dados da API
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [customIndicators, setCustomIndicators] = useState<CustomIndicatorData[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado: seleção do usuário
  const [selectedIndicators, setSelectedIndicators] = useState<SelectedIndicator[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [referenceMonth, setReferenceMonth] = useState<string>("");

  // Estado: visualização
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Estado: dialog de indicador custom
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  // Debounce para salvar template
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Carregar indicadores e template ──
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Carregar indicadores disponíveis
        const indRes = await fetch("/api/report/indicators", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const indData = await indRes.json();
        setCategories(indData.categories || []);
        setCustomIndicators(indData.customIndicators || []);

        // Carregar template salvo
        const tplRes = await fetch("/api/report/template", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const tplData = await tplRes.json();
        setSelectedIndicators(tplData.indicators || []);
        setReferenceMonth(tplData.referenceMonth || getMonthOptions()[0]?.value || "");
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({
          title: "Erro ao carregar",
          description: "Não foi possível carregar os indicadores. Tente recarregar a página.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ── Salvar template (debounced) ──
  const saveTemplate = useCallback(
    (indicators: SelectedIndicator[], month?: string) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch("/api/report/template", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({
              indicators,
              referenceMonth: month || referenceMonth,
            }),
          });
        } catch (error) {
          console.error("Erro ao salvar template:", error);
        }
      }, 800);
    },
    [referenceMonth]
  );

  // ── Adicionar indicador ──
  const addIndicator = (indicatorId: string, type: "standard" | "custom" = "standard") => {
    if (selectedIndicators.find((si) => si.id === indicatorId)) {
      toast({ title: "Indicador já adicionado", description: "Este indicador já está no relatório." });
      return;
    }
    if (selectedIndicators.length >= 20) {
      toast({
        title: "Limite atingido",
        description: "O relatório pode ter no máximo 20 indicadores.",
        variant: "destructive",
      });
      return;
    }
    const newSelected = [
      ...selectedIndicators,
      { id: indicatorId, type, order: selectedIndicators.length },
    ];
    setSelectedIndicators(newSelected);
    saveTemplate(newSelected);
  };

  // ── Remover indicador ──
  const removeIndicator = (indicatorId: string) => {
    const newSelected = selectedIndicators
      .filter((si) => si.id !== indicatorId)
      .map((si, idx) => ({ ...si, order: idx }));
    setSelectedIndicators(newSelected);
    saveTemplate(newSelected);
  };

  // ── Mover indicador (setas) ──
  const moveIndicator = (index: number, direction: "up" | "down") => {
    const newSelected = [...selectedIndicators];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSelected.length) return;

    [newSelected[index], newSelected[targetIndex]] = [newSelected[targetIndex], newSelected[index]];
    const reordered = newSelected.map((si, idx) => ({ ...si, order: idx }));
    setSelectedIndicators(reordered);
    saveTemplate(reordered);
  };

  // ── Verificar se indicador está selecionado ──
  const isSelected = (indicatorId: string) => {
    return selectedIndicators.some((si) => si.id === indicatorId);
  };

  // ── Buscar dados do indicador pelo ID ──
  const getIndicatorInfo = (id: string): { name: string; description: string; category: string } | null => {
    // Buscar nos padrão
    for (const cat of categories) {
      const found = cat.indicators.find((ind) => ind.id === id);
      if (found) return { name: found.name, description: found.description, category: cat.key };
    }
    // Buscar nos custom
    const custom = customIndicators.find((ci) => ci.id === id);
    if (custom) return { name: custom.name, description: custom.description, category: "CUSTOM" };
    return null;
  };

  // ── Gerar relatório ──
  const generateReport = async () => {
    if (selectedIndicators.length === 0) {
      toast({
        title: "Nenhum indicador selecionado",
        description: "Selecione pelo menos um indicador para gerar o relatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          month: referenceMonth,
          indicatorIds: selectedIndicators.map((si) => si.id),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao gerar relatório");
      }

      const report = await res.json();
      setGeneratedReport(report);
      setShowPreview(true);
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // ── Callback: indicador custom criado ──
  const onCustomIndicatorCreated = (indicator: CustomIndicatorData) => {
    setCustomIndicators((prev) => [...prev, indicator]);
    addIndicator(indicator.id, "custom");
    setShowCustomDialog(false);
    toast({ title: "Indicador criado", description: `"${indicator.name}" foi adicionado ao relatório.` });
  };

  // ── Indicadores da categoria selecionada ──
  const currentCategoryIndicators = selectedCategory
    ? categories.find((c) => c.key === selectedCategory)?.indicators || []
    : [];

  // ── Se está em modo preview ──
  if (showPreview && generatedReport) {
    return (
      <ReportPreview
        report={generatedReport}
        onBack={() => setShowPreview(false)}
      />
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Carregando indicadores...</span>
      </div>
    );
  }

  // ── Render principal ──
  return (
    <div className="container max-w-7xl py-6 space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monte seu Relatório</h1>
          <p className="text-muted-foreground mt-1">
            Selecione os indicadores que importam para o seu negócio e gere um relatório profissional.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={referenceMonth} onValueChange={(v) => { setReferenceMonth(v); saveTemplate(selectedIndicators, v); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Mês de referência" />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ══════════════════════════════════════════════
            LADO ESQUERDO: Esqueleto do Relatório
            ══════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <LayoutList className="h-5 w-5" />
                  Seu Relatório
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {selectedIndicators.length}/20 indicadores
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {selectedIndicators.length === 0 ? (
                /* ── Estado vazio ── */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <LayoutList className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Nenhum indicador selecionado</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Selecione uma categoria à direita e adicione os indicadores que deseja no seu relatório.
                  </p>
                </div>
              ) : (
                /* ── Lista de indicadores selecionados ── */
                <div className="space-y-2">
                  {selectedIndicators.map((si, index) => {
                    const info = getIndicatorInfo(si.id);
                    if (!info) return null;
                    const colorClass = CATEGORY_COLORS[info.category] || CATEGORY_COLORS.CUSTOM;

                    return (
                      <div
                        key={si.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
                      >
                        {/* Setas de reordenação */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveIndicator(index, "up")}
                            disabled={index === 0}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                            title="Mover para cima"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => moveIndicator(index, "down")}
                            disabled={index === selectedIndicators.length - 1}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Número de ordem */}
                        <span className="text-xs font-mono text-muted-foreground w-5 text-center">
                          {index + 1}
                        </span>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{info.name}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colorClass}`}>
                              {CATEGORY_LABELS[info.category] || info.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {info.description}
                          </p>
                        </div>

                        {/* Placeholder de valor */}
                        <span className="text-sm font-mono text-muted-foreground/50 whitespace-nowrap">
                          ---
                        </span>

                        {/* Botão remover */}
                        <button
                          onClick={() => removeIndicator(si.id)}
                          className="p-1 rounded hover:bg-destructive/10 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover indicador"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Botões de ação ── */}
              {selectedIndicators.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="default"
                      onClick={generateReport}
                      disabled={generating}
                      className="gap-2"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Visualizar Relatório
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════
            LADO DIREITO: Seleção de Indicadores
            ══════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          {/* ── Seletor de categoria (lista suspensa) ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Indicadores Disponíveis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione uma categoria para ver os indicadores disponíveis.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.key} value={cat.key}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[cat.key]?.split(" ")[0] || "bg-gray-300"}`} />
                        {cat.label}
                        <span className="text-muted-foreground text-xs">
                          ({cat.indicators.length})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  {customIndicators.length > 0 && (
                    <SelectItem value="CUSTOM">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-300" />
                        Customizados
                        <span className="text-muted-foreground text-xs">
                          ({customIndicators.length})
                        </span>
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* ── Lista de indicadores da categoria selecionada ── */}
              {selectedCategory && selectedCategory !== "CUSTOM" && (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {currentCategoryIndicators.map((ind) => {
                    const selected = isSelected(ind.id);
                    return (
                      <button
                        key={ind.id}
                        onClick={() => selected ? removeIndicator(ind.id) : addIndicator(ind.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          selected
                            ? "border-primary/50 bg-primary/5"
                            : "border-transparent hover:border-border hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${selected ? "text-primary" : ""}`}>
                            {ind.name}
                          </span>
                          {selected ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {ind.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Lista de indicadores customizados ── */}
              {selectedCategory === "CUSTOM" && (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {customIndicators.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum indicador customizado criado ainda.
                    </p>
                  ) : (
                    customIndicators.map((ind) => {
                      const selected = isSelected(ind.id);
                      return (
                        <button
                          key={ind.id}
                          onClick={() => selected ? removeIndicator(ind.id) : addIndicator(ind.id, "custom")}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            selected
                              ? "border-primary/50 bg-primary/5"
                              : "border-transparent hover:border-border hover:bg-accent/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${selected ? "text-primary" : ""}`}>
                              {ind.name}
                            </span>
                            {selected ? (
                              <Check className="h-4 w-4 text-primary" />
                            ) : (
                              <Plus className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {ind.description}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── Mensagem quando nenhuma categoria selecionada ── */}
              {!selectedCategory && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ChevronRight className="h-6 w-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Selecione uma categoria acima para ver os indicadores disponíveis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Card: Indicador Customizado via IA ── */}
          <Card>
            <CardContent className="pt-4">
              <Button
                variant="outline"
                className="w-full gap-2 justify-start"
                onClick={() => setShowCustomDialog(true)}
              >
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>Criar indicador personalizado com IA</span>
              </Button>
              <p className="text-xs text-muted-foreground mt-2 px-1">
                Descreva o indicador que deseja e a IA vai criá-lo para você.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Dialog de indicador customizado ── */}
      <CustomIndicatorDialog
        open={showCustomDialog}
        onOpenChange={setShowCustomDialog}
        onCreated={onCustomIndicatorCreated}
      />
    </div>
  );
}
