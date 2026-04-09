/**
 * CustomIndicatorDialog.tsx
 * 
 * Dialog para criar indicadores customizados via IA.
 * O usuário descreve o indicador em linguagem natural, a IA interpreta
 * e sugere nome, fórmula e texto explicativo.
 * 
 * Caminho no projeto: client/src/components/CustomIndicatorDialog.tsx
 */

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (indicator: CustomIndicatorData) => void;
}

// ============================================
// COMPONENTE
// ============================================

export default function CustomIndicatorDialog({
  open,
  onOpenChange,
  onCreated,
}: CustomIndicatorDialogProps) {
  const { toast } = useToast();

  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [notViableMessage, setNotViableMessage] = useState<string | null>(null);

  // ── Enviar descrição para a IA ──
  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 5) {
      toast({
        title: "Descrição muito curta",
        description: "Descreva com mais detalhes o indicador que deseja criar.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setSuggestion(null);
      setNotViableMessage(null);

      const res = await fetch("/api/report/indicators/custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
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
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o indicador. Tente novamente.",
        variant: "destructive",
      });
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

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Criar Indicador com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o indicador que deseja e a IA vai interpretá-lo e criá-lo para você.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* ── Campo de descrição ── */}
          {!notViableMessage && (
            <>
              <Textarea
                placeholder="Ex: Quero ver quanto gastei com marketing em relação à receita total..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={loading}
                className="resize-none"
              />

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Mín. 5 caracteres · Máx. 20 indicadores por empresa
                </p>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || description.trim().length < 5}
                  className="gap-2"
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
                </Button>
              </div>
            </>
          )}

          {/* ── Mensagem de não viável ── */}
          {notViableMessage && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 space-y-3">
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
                    <p className="text-xs text-muted-foreground mb-1">Sugestão da IA:</p>
                    <p className="text-sm font-medium">{suggestion.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{suggestion.description}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetry}
                    className="gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Tentar outro
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Exemplos ── */}
          {!loading && !notViableMessage && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Exemplos de indicadores:</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "Quanto gastei com marketing no mês",
                  "Proporção de custos fixos vs variáveis",
                  "Receita média por cliente",
                  "Total de multas pagas",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setDescription(example)}
                    className="text-xs px-2.5 py-1 rounded-full border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
