import { useForecastSummary, useActivities } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { KPICard } from '@/components/sales/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Target, TrendingUp, AlertTriangle, CalendarCheck, Trophy, XCircle, Ban, BarChart3, Percent } from 'lucide-react';

export default function DashboardPage() {
  const { data: summary, isLoading } = useForecastSummary();
  const { data: activities = [] } = useActivities();
  const { hasAnyRole } = useSalesAuth();

  const isManager = hasAnyRole(['admin', 'gerente_comercial']);
  const formatCurrency = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  const formatMonth = (m: string) => {
    if (m === 'sem_previsao') return 'Sem previsão';
    try { return new Date(m).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }); }
    catch { return m; }
  };

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
            <KPICard title="Valor Aberto" value={formatCurrency(summary?.total_open_amount)} icon={DollarSign} variant="default" />
            <KPICard title="Pipeline Ponderado" value={formatCurrency(summary?.total_weighted)} icon={Percent} variant="info" subtitle="amount × probabilidade" />
            <KPICard title="MRR Aberto" value={formatCurrency(summary?.total_open_mrr)} icon={TrendingUp} variant="default" />
          </div>

          {/* KPIs Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Ganhas (total)" value={formatCurrency(summary?.total_won_amount)} icon={Trophy} variant="success" subtitle={`${summary?.won_count || 0} oportunidades`} />
            <KPICard title="Ganhas (mês)" value={formatCurrency(summary?.won_this_month_amount)} icon={Trophy} variant="success" subtitle={`${summary?.won_this_month || 0} este mês`} />
            <KPICard title="Perdidas (mês)" value={formatCurrency(summary?.lost_this_month_amount)} icon={XCircle} variant="destructive" subtitle={`${summary?.lost_this_month || 0} este mês`} />
            <KPICard title="Sem Próxima Ação" value={summary?.no_next_action || 0} icon={AlertTriangle} variant={summary?.no_next_action > 0 ? 'warning' : 'default'} />
          </div>

          {/* Pipeline by Stage */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Pipeline por Estágio
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!summary?.by_stage?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum estágio configurado</p>
              ) : (
                <div className="space-y-3">
                  {summary.by_stage.map((s: any) => (
                    <div key={s.stage_id} className="flex items-center gap-3">
                      <div className="w-36 text-sm font-medium truncate">{s.stage_name}</div>
                      <div className="flex-1 bg-muted rounded-full h-7 relative overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center px-2 text-[10px] font-semibold text-white min-w-[32px]"
                          style={{
                            width: `${Math.max(s.count / Math.max(...summary.by_stage.map((x: any) => x.count), 1) * 100, 8)}%`,
                            backgroundColor: s.color || 'hsl(var(--primary))',
                          }}
                        >
                          {s.count}
                        </div>
                      </div>
                      <div className="w-28 text-right text-xs text-muted-foreground">{formatCurrency(s.amount)}</div>
                      <div className="w-28 text-right text-xs font-medium text-primary">{formatCurrency(s.weighted)}</div>
                    </div>
                  ))}
                  <div className="flex items-center gap-3 pt-2 border-t text-xs text-muted-foreground">
                    <div className="w-36" />
                    <div className="flex-1" />
                    <div className="w-28 text-right">Bruto</div>
                    <div className="w-28 text-right">Ponderado</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Forecast by Month */}
          {summary?.by_month?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4" /> Previsão por Mês
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.by_month.map((m: any) => (
                    <div key={m.month} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{formatMonth(m.month)}</p>
                        <p className="text-xs text-muted-foreground">{m.count} oportunidade{m.count > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(m.amount)}</p>
                        <p className="text-xs text-primary">{formatCurrency(m.weighted)} pond.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* By Owner (manager only) */}
          {isManager && summary?.by_owner?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold">Pipeline por Responsável</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {summary.by_owner.map((o: any) => (
                    <div key={o.owner_user_id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium font-mono text-muted-foreground">{o.owner_user_id.substring(0, 8)}...</p>
                        <p className="text-xs text-muted-foreground">{o.count} oportunidade{o.count > 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(o.amount)}</p>
                        <p className="text-xs text-primary">{formatCurrency(o.weighted)} pond.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                        <p className={`text-xs ${isOverdue ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          {act.due_at ? new Date(act.due_at).toLocaleDateString('pt-BR') : '—'}
                        </p>
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
