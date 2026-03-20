import { useDashboardSummary, useActivities } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { KPICard } from '@/components/sales/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Target, TrendingUp, AlertTriangle, CalendarCheck, Trophy, XCircle, Ban } from 'lucide-react';

export default function DashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: activities = [] } = useActivities();
  const { hasAnyRole } = useSalesAuth();

  const isManager = hasAnyRole(['admin', 'gerente_comercial']);
  const formatCurrency = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  const pendingActivities = activities
    .filter((a: any) => a.status === 'pending')
    .sort((a: any, b: any) => {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return a.due_at.localeCompare(b.due_at);
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>
        <p className="text-sm text-muted-foreground">
          {isManager ? 'Visão gerencial — todos os registros' : 'Meus números'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* KPIs Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Pipeline Aberto" value={summary?.open_count || 0} icon={Target} variant="info" subtitle="oportunidades ativas" />
            <KPICard title="Valor Aberto" value={formatCurrency(summary?.total_open_amount)} icon={DollarSign} variant="success" />
            <KPICard title="MRR Aberto" value={formatCurrency(summary?.total_open_mrr)} icon={TrendingUp} variant="default" />
            <KPICard title="Ganho Total" value={formatCurrency(summary?.total_won_amount)} icon={Trophy} variant="success" />
          </div>

          {/* KPIs Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Ganhas" value={summary?.won_count || 0} icon={Trophy} variant="success" />
            <KPICard title="Perdidas" value={summary?.lost_count || 0} icon={XCircle} variant="destructive" />
            <KPICard title="Atividades Hoje" value={summary?.today_activities || 0} icon={CalendarCheck} />
            <KPICard
              title="Follow-ups Vencidos"
              value={summary?.overdue_activities || 0}
              icon={AlertTriangle}
              variant={summary?.overdue_activities > 0 ? 'warning' : 'default'}
            />
          </div>

          {summary?.no_next_action > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
              <Ban className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {summary.no_next_action} oportunidade{summary.no_next_action > 1 ? 's' : ''} sem próxima ação
                </p>
                <p className="text-xs text-muted-foreground">Adicione atividades para manter o pipeline ativo</p>
              </div>
            </div>
          )}

          {/* Pipeline by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Pipeline por Estágio</CardTitle>
            </CardHeader>
            <CardContent>
              {!summary?.pipeline_by_stage?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum estágio configurado</p>
              ) : (
                <div className="space-y-3">
                  {summary.pipeline_by_stage.map((s: any) => (
                    <div key={s.stage_id} className="flex items-center gap-3">
                      <div className="w-36 text-sm font-medium truncate">{s.stage_name}</div>
                      <div className="flex-1 bg-muted rounded-full h-7 relative overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center px-2 text-[10px] font-semibold text-white min-w-[32px]"
                          style={{
                            width: `${Math.max(
                              summary.pipeline_by_stage.length > 0
                                ? (s.count / Math.max(...summary.pipeline_by_stage.map((x: any) => x.count), 1)) * 100
                                : 0,
                              8
                            )}%`,
                            backgroundColor: s.color || 'hsl(var(--primary))',
                          }}
                        >
                          {s.count}
                        </div>
                      </div>
                      <div className="w-32 text-right text-sm text-muted-foreground">{formatCurrency(s.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Próximas Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade pendente</p>
              ) : (
                <div className="space-y-3">
                  {pendingActivities.map((act: any) => {
                    const isOverdue = act.due_at && new Date(act.due_at) < new Date();
                    return (
                      <div key={act.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${isOverdue ? 'bg-destructive/5 -mx-2 px-2 rounded' : ''}`}>
                        <div>
                          <p className="text-sm font-medium">{act.subject}</p>
                          <p className="text-xs text-muted-foreground">{act.activity_type} • {act.account?.name || act.opportunity?.title || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            {act.due_at ? new Date(act.due_at).toLocaleDateString('pt-BR') : '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
