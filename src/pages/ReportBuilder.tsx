/**
 * ReportBuilder.tsx
 *
 * Tela principal "Monte seu Relatório" — permite ao usuário selecionar indicadores
 * de uma lista suspensa por categoria, reordená-los com setas, visualizar com dados
 * reais e exportar em PDF.
 *
 * Caminho no projeto: client/src/pages/ReportBuilder.tsx
 *
 * UI: Tailwind CSS puro + Lucide icons (sem shadcn/ui)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Eye,
  Sparkles,
  ChevronRight,
  LayoutList,
  Loader2,
  Check,
  Save,
  Trash2,
  Calendar,
  FileBarChart2,
} from "lucide-react";
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

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  RENTABILIDADE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CUSTOS: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  FLUXO_CAIXA: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  FORNECEDORES_CLIENTES: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  OPERACAO: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  CUSTOM: { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" },
};

const CATEGORY_LABELS: Record<string, string> = {
  RENTABILIDADE: "Rentabilidade",
  CUSTOS: "Estrutura de Custos",
  FLUXO_CAIXA: "Fluxo de Caixa",
  FORNECEDORES_CLIENTES: "Fornecedores e Clientes",
  OPERACAO: "Operação e Tendência",
  CUSTOM: "Customizados",
};

function getCatStyle(cat: string) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.CUSTOM;
}

function getMonthOptions(): Array<{ value: string; label: string }> {
  const options: Array<{ value: string; label: string }> = [];
  const now = new Date();
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
    options.push({ value, label });
  }
  return options;
}

// ============================================
// TOAST SIMPLES (inline)
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
      className={`fixed top-5 right-5 z-[9999] px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all animate-in fade-in slide-in-from-top-2 ${
        msg.type === "success" ? "bg-emerald-600" : msg.type === "error" ? "bg-red-600" : "bg-blue-600"
      }`}
    >
      {msg.text}
    </div>
  ) : null;

  return { show, ToastEl };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function ReportBuilder() {
  const toast = useSimpleToast();

  // Estado: dados da API
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [customIndicators, setCustomIndicators] = useState<CustomIndicatorData[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado: seleção do usuário
  const [selectedIndicators, setSelectedIndicators] = useState<SelectedIndicator[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [referenceMonth, setReferenceMonth] = useState<string>("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  // Estado: visualização
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Estado: dialog de indicador custom
  const [showCustomDialog, setShowCustomDialog] = useState(false);

  // Debounce para salvar template
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs para fechar dropdowns ao clicar fora
  const catDropdownRef = useRef<HTMLDivElement>(null);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setMonthDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Carregar indicadores e template ──
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const [indRes, tplRes] = await Promise.all([
          fetch("/api/report/indicators", { headers }),
          fetch("/api/report/template", { headers }),
        ]);

        const indData = await indRes.json();
        const tplData = await tplRes.json();

        setCategories(indData.categories || []);
        setCustomIndicators(indData.customIndicators || []);
        setSelectedIndicators(tplData.indicators || []);
        setReferenceMonth(tplData.referenceMonth || getMonthOptions()[0]?.value || "");
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.show("Erro ao carregar indicadores. Tente recarregar.", "error");
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
          const token = localStorage.getItem("token");
          await fetch("/api/report/template", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      toast.show("Este indicador já está no relatório.", "info");
      return;
    }
    if (selectedIndicators.length >= 20) {
      toast.show("O relatório pode ter no máximo 20 indicadores.", "error");
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
    for (const cat of categories) {
      const found = cat.indicators.find((ind) => ind.id === id);
      if (found) return { name: found.name, description: found.description, category: cat.key };
    }
    const custom = customIndicators.find((ci) => ci.id === id);
    if (custom) return { name: custom.name, description: custom.description, category: "CUSTOM" };
    return null;
  };

  // ── Gerar relatório ──
  const generateReport = async () => {
    if (selectedIndicators.length === 0) {
      toast.show("Selecione pelo menos um indicador.", "error");
      return;
    }

    try {
      setGenerating(true);
      const token = localStorage.getItem("token");
      const res = await fetch("/api/report/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

      const report: GeneratedReport = await res.json();
      setGeneratedReport(report);
      setShowPreview(true);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Tente novamente.";
      toast.show(`Erro ao gerar relatório: ${msg}`, "error");
    } finally {
      setGenerating(false);
    }
  };

  // ── Callback: indicador custom criado ──
  const onCustomIndicatorCreated = (indicator: CustomIndicatorData) => {
    setCustomIndicators((prev) => [...prev, indicator]);
    addIndicator(indicator.id, "custom");
    setShowCustomDialog(false);
    toast.show(`Indicador "${indicator.name}" adicionado!`, "success");
  };

  // ── Indicadores da categoria selecionada ──
  const currentCategoryIndicators = selectedCategory && selectedCategory !== "CUSTOM"
    ? categories.find((c) => c.key === selectedCategory)?.indicators || []
    : [];

  const monthOptions = getMonthOptions();
  const selectedMonthLabel = monthOptions.find((o) => o.value === referenceMonth)?.label || "Selecione...";

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
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500">Carregando indicadores...</span>
      </div>
    );
  }

  // ── Render principal ──
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {toast.ToastEl}

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart2 className="h-6 w-6 text-blue-600" />
            Monte seu Relatório
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Selecione os indicadores que importam para o seu negócio e gere um relatório profissional.
          </p>
        </div>

        {/* Seletor de mês */}
        <div className="relative" ref={monthDropdownRef}>
          <button
            onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm min-w-[220px] justify-between"
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              {selectedMonthLabel}
            </span>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${monthDropdownOpen ? "rotate-180" : ""}`} />
          </button>
          {monthDropdownOpen && (
            <div className="absolute right-0 z-30 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {monthOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setReferenceMonth(opt.value);
                    setMonthDropdownOpen(false);
                    saveTemplate(selectedIndicators, opt.value);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                    referenceMonth === opt.value ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ══════════════════════════════════════════════
            LADO ESQUERDO: Esqueleto do Relatório
            ══════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Seu Relatório</h2>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {selectedIndicators.length}/20 indicadores
              </span>
            </div>

            {/* Conteúdo */}
            <div className="p-5">
              {selectedIndicators.length === 0 ? (
                /* ── Estado vazio ── */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-gray-100 p-4 mb-4">
                    <LayoutList className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">Nenhum indicador selecionado</h3>
                  <p className="text-gray-500 max-w-sm text-sm">
                    Selecione uma categoria à direita e adicione os indicadores que deseja no seu relatório.
                  </p>
                </div>
              ) : (
                /* ── Lista de indicadores selecionados ── */
                <div className="space-y-2">
                  {selectedIndicators.map((si, index) => {
                    const info = getIndicatorInfo(si.id);
                    if (!info) return null;
                    const style = getCatStyle(info.category);

                    return (
                      <div
                        key={si.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors group"
                      >
                        {/* Setas de reordenação */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveIndicator(index, "up")}
                            disabled={index === 0}
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                            title="Mover para cima"
                          >
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => moveIndicator(index, "down")}
                            disabled={index === selectedIndicators.length - 1}
                            className="p-0.5 rounded hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed transition-opacity"
                            title="Mover para baixo"
                          >
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </button>
                        </div>

                        {/* Número de ordem */}
                        <span className="text-xs font-mono text-gray-400 w-5 text-center">
                          {index + 1}
                        </span>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm text-gray-900">{info.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${style.bg} ${style.text} ${style.border}`}>
                              {CATEGORY_LABELS[info.category] || info.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {info.description}
                          </p>
                        </div>

                        {/* Placeholder de valor */}
                        <span className="text-sm font-mono text-gray-300 whitespace-nowrap">
                          ---
                        </span>

                        {/* Botão remover */}
                        <button
                          onClick={() => removeIndicator(si.id)}
                          className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-gray-400 opacity-0 group-hover:opacity-100 transition-all"
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
                  <div className="border-t border-gray-100 mt-5 pt-4 flex items-center justify-end gap-3">
                    <button
                      onClick={generateReport}
                      disabled={generating}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        generating
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                      }`}
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
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            LADO DIREITO: Seleção de Indicadores
            ══════════════════════════════════════════════ */}
        <div className="lg:col-span-5 space-y-4">
          {/* ── Seletor de categoria (dropdown customizado) ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Indicadores Disponíveis</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Selecione uma categoria para ver os indicadores disponíveis.
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Dropdown de categoria */}
              <div className="relative" ref={catDropdownRef}>
                <button
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span>
                    {selectedCategory
                      ? CATEGORY_LABELS[selectedCategory] || selectedCategory
                      : "Selecione uma categoria..."}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {categoryDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                    {categories.map((cat) => {
                      const style = getCatStyle(cat.key);
                      return (
                        <button
                          key={cat.key}
                          onClick={() => {
                            setSelectedCategory(cat.key);
                            setCategoryDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                            selectedCategory === cat.key ? "bg-blue-50" : ""
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${style.bg.replace("50", "400")}`} />
                            {cat.label}
                          </span>
                          <span className="text-xs text-gray-400">
                            ({cat.indicators.length})
                          </span>
                        </button>
                      );
                    })}
                    {customIndicators.length > 0 && (
                      <button
                        onClick={() => {
                          setSelectedCategory("CUSTOM");
                          setCategoryDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                          selectedCategory === "CUSTOM" ? "bg-blue-50" : ""
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Customizados
                        </span>
                        <span className="text-xs text-gray-400">
                          ({customIndicators.length})
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Lista de indicadores da categoria selecionada ── */}
              {selectedCategory && selectedCategory !== "CUSTOM" && (
                <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {currentCategoryIndicators.map((ind) => {
                    const sel = isSelected(ind.id);
                    return (
                      <button
                        key={ind.id}
                        onClick={() => sel ? removeIndicator(ind.id) : addIndicator(ind.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${
                          sel
                            ? "border-blue-300 bg-blue-50"
                            : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${sel ? "text-blue-700" : "text-gray-900"}`}>
                            {ind.name}
                          </span>
                          {sel ? (
                            <Check className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Plus className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">
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
                    <p className="text-sm text-gray-500 text-center py-4">
                      Nenhum indicador customizado criado ainda.
                    </p>
                  ) : (
                    customIndicators.map((ind) => {
                      const sel = isSelected(ind.id);
                      return (
                        <button
                          key={ind.id}
                          onClick={() => sel ? removeIndicator(ind.id) : addIndicator(ind.id, "custom")}
                          className={`w-full text-left p-3 rounded-lg border transition-all ${
                            sel
                              ? "border-blue-300 bg-blue-50"
                              : "border-transparent hover:border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${sel ? "text-blue-700" : "text-gray-900"}`}>
                              {ind.name}
                            </span>
                            {sel ? (
                              <Check className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Plus className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2">
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
                  <ChevronRight className="h-6 w-6 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    Selecione uma categoria acima para ver os indicadores disponíveis.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Card: Indicador Customizado via IA ── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <button
              onClick={() => setShowCustomDialog(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-200 hover:text-purple-700 transition-all"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Criar indicador personalizado com IA</span>
            </button>
            <p className="text-xs text-gray-500 mt-2 px-1">
              Descreva o indicador que deseja e a IA vai criá-lo para você.
            </p>
          </div>
        </div>
      </div>

      {/* ── Dialog de indicador customizado ── */}
      {showCustomDialog && (
        <CustomIndicatorDialog
          onClose={() => setShowCustomDialog(false)}
          onCreated={onCustomIndicatorCreated}
        />
      )}
    </div>
  );
}
