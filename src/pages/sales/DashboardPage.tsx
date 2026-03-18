import { useOpportunities, useActivities, useProposals, usePipelineStages } from '@/hooks/useSalesData';
import { KPICard } from '@/components/sales/KPICard';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { DollarSign, Target, FileText, CalendarCheck, AlertTriangle, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { data: opportunities = [], isLoading: loadingOpp } = useOpportunities();
  const { data: activities = [], isLoading: loadingAct } = useActivities();
  const { data: proposals = [], isLoading: loadingProp } = useProposals();
  const { data: stages = [] } = usePipelineStages();

  const kpis = useMemo(() => {
    const open = opportunities.filter((o: any) => o.pipeline_status === 'open');
    const totalMRR = open.reduce((s: number, o: any) => s + (o.estimated_mrr || 0), 0);
    const totalTCV = open.reduce((s: number, o: any) => s + (o.estimated_tcv || 0), 0);
    const totalPipeline = open.length;

    const today = new Date().toISOString().split('T')[0];
    const todayAct = activities.filter((a: any) => a.due_date?.startsWith(today) && a.status !== 'completed');
    const overdue = activities.filter((a: any) => a.due_date && a.due_date < today && a.status !== 'completed');

    const sent = proposals.filter((p: any) => p.status === 'sent').length;
    const approved = proposals.filter((p: any) => p.status === 'approved').length;
    const rejected = proposals.filter((p: any) => p.status === 'rejected').length;

    const noNextAction = open.filter((o: any) => {
      const hasActivity = activities.some((a: any) => a.opportunity_id === o.id && a.status !== 'completed');
      return !hasActivity;
    }).length;

    return { totalPipeline, totalMRR, totalTCV, todayAct: todayAct.length, overdue: overdue.length, sent, approved, rejected, noNextAction };
  }, [opportunities, activities, proposals]);

  const oppByStage = useMemo(() => {
    return stages.map((s: any) => {
      const stageOpps = opportunities.filter((o: any) => o.stage_id === s.id && o.pipeline_status === 'open');
      return {
        stage: s.stage_name,
        count: stageOpps.length,
        value: stageOpps.reduce((sum: number, o: any) => sum + (o.estimated_tcv || 0), 0),
        color: s.color,
      };
    });
  }, [opportunities, stages]);

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  const loading = loadingOpp || loadingAct || loadingProp;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">Dashboard de execução comercial</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Pipeline Aberto" value={kpis.totalPipeline} icon={Target} variant="info" subtitle="oportunidades ativas" />
        <KPICard title="MRR Potencial" value={formatCurrency(kpis.totalMRR)} icon={DollarSign} variant="success" />
        <KPICard title="TCV Potencial" value={formatCurrency(kpis.totalTCV)} icon={TrendingUp} variant="default" />
        <KPICard title="Follow-ups Vencidos" value={kpis.overdue} icon={AlertTriangle} variant={kpis.overdue > 0 ? 'warning' : 'default'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Atividades Hoje" value={kpis.todayAct} icon={CalendarCheck} />
        <KPICard title="Propostas Enviadas" value={kpis.sent} icon={FileText} variant="info" />
        <KPICard title="Propostas Aprovadas" value={kpis.approved} icon={FileText} variant="success" />
        <KPICard title="Sem Próxima Ação" value={kpis.noNextAction} icon={AlertTriangle} variant={kpis.noNextAction > 0 ? 'destructive' : 'default'} />
      </div>

      {/* Pipeline by Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Oportunidades por Etapa</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-32 bg-muted/50 rounded animate-pulse" />
          ) : oppByStage.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum estágio configurado</p>
          ) : (
            <div className="space-y-3">
              {oppByStage.map((s: any) => (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium truncate">{s.stage}</div>
                  <div className="flex-1 bg-muted rounded-full h-6 relative overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center px-2 text-[10px] font-semibold text-white"
                      style={{
                        width: `${Math.max(oppByStage.length > 0 ? (s.count / Math.max(...oppByStage.map((x: any) => x.count), 1)) * 100 : 0, 8)}%`,
                        backgroundColor: s.color || 'hsl(var(--primary))',
                      }}
                    >
                      {s.count}
                    </div>
                  </div>
                  <div className="w-28 text-right text-sm text-muted-foreground">{formatCurrency(s.value)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Opportunities & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Oportunidades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opportunities.slice(0, 5).map((opp: any) => (
                <div key={opp.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{opp.title}</p>
                    <p className="text-xs text-muted-foreground">{opp.account?.company_name || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(opp.estimated_tcv || 0)}</p>
                    <StatusBadge status={opp.pipeline_status} />
                  </div>
                </div>
              ))}
              {opportunities.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma oportunidade</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Atividades Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities.filter((a: any) => a.status !== 'completed').slice(0, 5).map((act: any) => {
                const isOverdue = act.due_date && act.due_date < new Date().toISOString().split('T')[0];
                return (
                  <div key={act.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${isOverdue ? 'bg-destructive/5 -mx-2 px-2 rounded' : ''}`}>
                    <div>
                      <p className="text-sm font-medium">{act.title}</p>
                      <p className="text-xs text-muted-foreground">{act.opportunity?.title || act.account?.company_name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                        {act.due_date ? new Date(act.due_date).toLocaleDateString('pt-BR') : '—'}
                      </p>
                      <StatusBadge status={isOverdue ? 'overdue' : act.status} />
                    </div>
                  </div>
                );
              })}
              {activities.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
