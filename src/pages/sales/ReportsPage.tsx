import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOpportunities, useActivities, useProposals, usePipelineStages } from '@/hooks/useSalesData';
import { BarChart3, TrendingDown, Target, Users, FileText, Clock } from 'lucide-react';
import { useMemo } from 'react';

export default function ReportsPage() {
  const { data: opportunities = [] } = useOpportunities();
  const { data: activities = [] } = useActivities();
  const { data: proposals = [] } = useProposals();
  const { data: stages = [] } = usePipelineStages();

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  // Pipeline by stage
  const pipelineByStage = useMemo(() => {
    return stages.map((s: any) => {
      const stageOpps = opportunities.filter((o: any) => o.stage_id === s.id);
      return { stage: s.stage_name, count: stageOpps.length, value: stageOpps.reduce((sum: number, o: any) => sum + (o.estimated_tcv || 0), 0) };
    });
  }, [opportunities, stages]);

  // Loss reasons
  const lossReasons = useMemo(() => {
    const lost = opportunities.filter((o: any) => o.pipeline_status === 'lost');
    const reasons: Record<string, number> = {};
    lost.forEach((o: any) => {
      const r = o.loss_reason?.reason_name || 'Não informado';
      reasons[r] = (reasons[r] || 0) + 1;
    });
    return Object.entries(reasons).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [opportunities]);

  // Proposals by status
  const proposalsByStatus = useMemo(() => {
    const statuses: Record<string, number> = {};
    proposals.forEach((p: any) => { statuses[p.status] = (statuses[p.status] || 0) + 1; });
    return Object.entries(statuses).map(([status, count]) => ({ status, count }));
  }, [proposals]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Análises do desempenho comercial</p>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="conversion">Conversão</TabsTrigger>
          <TabsTrigger value="loss">Motivos de Perda</TabsTrigger>
          <TabsTrigger value="proposals">Propostas</TabsTrigger>
          <TabsTrigger value="activities">Atividades</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <Card>
            <CardHeader><CardTitle className="text-base">Pipeline por Etapa</CardTitle></CardHeader>
            <CardContent>
              {pipelineByStage.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {pipelineByStage.map((s) => (
                    <div key={s.stage} className="flex items-center gap-3">
                      <div className="w-36 text-sm truncate">{s.stage}</div>
                      <div className="flex-1 bg-muted rounded-full h-7 relative overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary flex items-center px-3 text-xs font-medium text-primary-foreground"
                          style={{ width: `${Math.max((s.count / Math.max(...pipelineByStage.map(x => x.count), 1)) * 100, 10)}%` }}
                        >
                          {s.count}
                        </div>
                      </div>
                      <div className="w-28 text-right text-sm font-medium">{formatCurrency(s.value)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion">
          <Card>
            <CardHeader><CardTitle className="text-base">Funil de Conversão</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pipelineByStage.map((s, i) => (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-36 text-sm">{s.stage}</div>
                    <div className="flex-1 bg-muted rounded h-8 flex items-center justify-center relative overflow-hidden" style={{ maxWidth: `${100 - i * 12}%` }}>
                      <div className="absolute inset-0 bg-primary opacity-20" style={{ opacity: 0.1 + i * 0.05 }} />
                      <span className="relative text-xs font-medium">{s.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loss">
          <Card>
            <CardHeader><CardTitle className="text-base">Motivos de Perda</CardTitle></CardHeader>
            <CardContent>
              {lossReasons.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem dados de perda</p>
              ) : (
                <div className="space-y-3">
                  {lossReasons.map((r) => (
                    <div key={r.reason} className="flex items-center justify-between py-2 border-b last:border-0">
                      <span className="text-sm">{r.reason}</span>
                      <span className="text-sm font-semibold text-destructive">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proposals">
          <Card>
            <CardHeader><CardTitle className="text-base">Propostas por Status</CardTitle></CardHeader>
            <CardContent>
              {proposalsByStatus.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Sem propostas</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {proposalsByStatus.map((p) => (
                    <div key={p.status} className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{p.count}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities">
          <Card>
            <CardHeader><CardTitle className="text-base">Resumo de Atividades</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{activities.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{activities.filter((a: any) => a.status === 'completed').length}</p>
                  <p className="text-xs text-muted-foreground">Concluídas</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold">{activities.filter((a: any) => a.status !== 'completed').length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center p-4 border rounded-lg text-destructive">
                  <p className="text-2xl font-bold">{activities.filter((a: any) => a.due_date && a.due_date < new Date().toISOString().split('T')[0] && a.status !== 'completed').length}</p>
                  <p className="text-xs">Vencidas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
