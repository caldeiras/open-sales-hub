import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOpportunityScores, useRecommendations, useDismissRecommendation, useDismissAllRecommendations, useRiskFlags, useResolveRiskFlag } from '@/hooks/useIntelligenceData';
import { Target, AlertTriangle, Lightbulb, TrendingUp, Phone, FileText, RotateCw, X, CheckCircle2, Shield } from 'lucide-react';
import { toast } from 'sonner';

const recTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  followup_urgente: { label: 'Follow-up Urgente', icon: RotateCw, color: 'text-orange-600' },
  ligar_agora: { label: 'Ligar Agora', icon: Phone, color: 'text-red-600' },
  enviar_proposta: { label: 'Enviar Proposta', icon: FileText, color: 'text-blue-600' },
};

const severityConfig: Record<string, string> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline',
};

export default function PriorityPage() {
  const { data: scores = [], isLoading: loadingScores } = useOpportunityScores();
  const { data: recommendations = [], isLoading: loadingRecs } = useRecommendations();
  const { data: risks = [], isLoading: loadingRisks } = useRiskFlags(false);
  const dismiss = useDismissRecommendation();
  const dismissAll = useDismissAllRecommendations();
  const resolveRisk = useResolveRiskFlag();

  const top10 = (scores as any[]).slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inteligência Comercial</h1>
          <p className="text-muted-foreground">Prioridades, recomendações e riscos</p>
        </div>
      </div>

      {/* Today's Actions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="h-5 w-5 text-primary" />
            Hoje você deve fazer isso
          </CardTitle>
          <CardDescription>Ações priorizadas automaticamente</CardDescription>
          {(recommendations as any[]).length > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => { dismissAll.mutate(undefined as any); toast.success('Todas as recomendações descartadas'); }}>
              Descartar todas
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingRecs ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : (recommendations as any[]).length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma recomendação pendente. 🎉</p>
          ) : (
            <div className="space-y-3">
              {(recommendations as any[]).slice(0, 8).map((rec: any) => {
                const cfg = recTypeConfig[rec.type] || { label: rec.type, icon: Lightbulb, color: 'text-foreground' };
                const Icon = cfg.icon;
                return (
                  <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                    <Icon className={`h-5 w-5 mt-0.5 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cfg.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.message}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { dismiss.mutate(rec.id); toast.success('Descartada'); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="ranking" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ranking" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> Top Oportunidades
          </TabsTrigger>
          <TabsTrigger value="risks" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" /> Riscos
            {(risks as any[]).length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{(risks as any[]).length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 Oportunidades por Score</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingScores ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : top10.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum score calculado ainda.</p>
              ) : (
                <div className="space-y-2">
                  {top10.map((s: any, idx: number) => (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.opportunity?.name || 'Oportunidade'}</p>
                        <p className="text-xs text-muted-foreground">
                          Score: {s.score} | Estágio: {s.stage_weight} | Valor: {s.value_weight} | Recência: {s.recency_weight} | Atividade: {s.activity_weight}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          <Target className="h-3 w-3 mr-1" />
                          {s.score}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" /> Oportunidades em Risco
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRisks ? (
                <p className="text-muted-foreground text-sm">Carregando...</p>
              ) : (risks as any[]).length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum risco detectado. ✅</p>
              ) : (
                <div className="space-y-2">
                  {(risks as any[]).map((r: any) => (
                    <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${r.severity === 'high' ? 'text-destructive' : 'text-orange-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{r.opportunity?.name || 'Oportunidade'}</p>
                          <Badge variant={severityConfig[r.severity] as any || 'outline'} className="text-[10px]">{r.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>
                        <p className="text-[10px] text-muted-foreground">{r.type}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => { resolveRisk.mutate(r.id); toast.success('Risco resolvido'); }}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Resolver
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
