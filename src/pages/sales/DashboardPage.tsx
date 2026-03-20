import { useForecastSummary, useActivities, useRevenueSummary, useRankingSummary, useGoalPerformance } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { KPICard } from '@/components/sales/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { DollarSign, Target, TrendingUp, AlertTriangle, CalendarCheck, Trophy, XCircle, BarChart3, Percent, TrendingDown, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { data: forecast, isLoading: forecastLoading } = useForecastSummary();
  const { data: revenue, isLoading: revenueLoading } = useRevenueSummary();
  const { data: activities = [] } = useActivities();
  const { hasAnyRole } = useSalesAuth();

  const isManager = hasAnyRole(['admin', 'gerente_comercial']);
  const isLoading = forecastLoading || revenueLoading;
  const formatCurrency = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  const formatMonth = (m: string) => {
    if (!m || m === 'sem_previsao' || m === 'unknown') return 'Sem previsão';
    try { return new Date(m + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }); }
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
        <Tabs defaultValue="pipeline" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="revenue">Receita</TabsTrigger>
          </TabsList>

          {/* PIPELINE TAB */}
          <TabsContent value="pipeline" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Pipeline Aberto" value={forecast?.open_count || 0} icon={Target} variant="info" subtitle="oportunidades ativas" />
              <KPICard title="Valor Aberto" value={formatCurrency(forecast?.total_open_amount)} icon={DollarSign} variant="default" />
              <KPICard title="Pipeline Ponderado" value={formatCurrency(forecast?.total_weighted)} icon={Percent} variant="info" subtitle="amount × probabilidade" />
              <KPICard title="MRR Aberto" value={formatCurrency(forecast?.total_open_mrr)} icon={TrendingUp} variant="default" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Ganhas (total)" value={formatCurrency(forecast?.total_won_amount)} icon={Trophy} variant="success" subtitle={`${forecast?.won_count || 0} oportunidades`} />
              <KPICard title="Ganhas (mês)" value={formatCurrency(forecast?.won_this_month_amount)} icon={Trophy} variant="success" subtitle={`${forecast?.won_this_month || 0} este mês`} />
              <KPICard title="Perdidas (mês)" value={formatCurrency(forecast?.lost_this_month_amount)} icon={XCircle} variant="destructive" subtitle={`${forecast?.lost_this_month || 0} este mês`} />
              <KPICard title="Sem Próxima Ação" value={forecast?.no_next_action || 0} icon={AlertTriangle} variant={forecast?.no_next_action > 0 ? 'warning' : 'default'} />
            </div>

            {/* Pipeline by Stage */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" /> Pipeline por Estágio
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!forecast?.by_stage?.length ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum estágio configurado</p>
                ) : (
                  <div className="space-y-3">
                    {forecast.by_stage.map((s: any) => (
                      <div key={s.stage_id} className="flex items-center gap-3">
                        <div className="w-36 text-sm font-medium truncate">{s.stage_name}</div>
                        <div className="flex-1 bg-muted rounded-full h-7 relative overflow-hidden">
                          <div
                            className="h-full rounded-full flex items-center px-2 text-[10px] font-semibold text-white min-w-[32px]"
                            style={{
                              width: `${Math.max(s.count / Math.max(...forecast.by_stage.map((x: any) => x.count), 1) * 100, 8)}%`,
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
            {forecast?.by_month?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" /> Previsão por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {forecast.by_month.map((m: any) => (
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
            {isManager && forecast?.by_owner?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Pipeline por Responsável</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {forecast.by_owner.map((o: any) => (
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
          </TabsContent>

          {/* REVENUE TAB */}
          <TabsContent value="revenue" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="MRR Atual" value={formatCurrency(revenue?.total_mrr)} icon={DollarSign} variant="success" subtitle={`${revenue?.won_count || 0} contratos ganhos`} />
              <KPICard title="ARR Atual" value={formatCurrency(revenue?.total_arr)} icon={TrendingUp} variant="success" />
              <KPICard title="TCV Total" value={formatCurrency(revenue?.total_tcv)} icon={Target} variant="info" />
              <KPICard title="Net New MRR (mês)" value={formatCurrency(revenue?.net_new_mrr_this_month)} icon={revenue?.net_new_mrr_this_month >= 0 ? ArrowUpRight : ArrowDownRight} variant={revenue?.net_new_mrr_this_month >= 0 ? 'success' : 'destructive'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="New MRR (mês)" value={formatCurrency(revenue?.new_mrr_this_month)} icon={ArrowUpRight} variant="success" />
              <KPICard title="Expansão MRR (mês)" value={formatCurrency(revenue?.expansion_mrr_this_month)} icon={TrendingUp} variant="info" />
              <KPICard title="Churn MRR (mês)" value={formatCurrency(revenue?.churn_mrr_this_month)} icon={TrendingDown} variant="destructive" />
              <KPICard title="Renovação MRR (mês)" value={formatCurrency(revenue?.renewal_mrr_this_month)} icon={RefreshCw} variant="default" />
            </div>

            {/* Revenue by Type */}
            {revenue?.by_type?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Eventos por Tipo</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {revenue.by_type.map((t: any) => {
                      const labels: Record<string, string> = { new: 'Nova Venda', expansion: 'Expansão', contraction: 'Contração', churn: 'Churn', renewal: 'Renovação' };
                      return (
                        <div key={t.event_type} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="text-sm font-medium">{labels[t.event_type] || t.event_type}</p>
                            <p className="text-xs text-muted-foreground">{t.count} evento{t.count > 1 ? 's' : ''}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${t.mrr < 0 ? 'text-destructive' : 'text-emerald-600'}`}>{formatCurrency(t.mrr)} MRR</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(t.tcv)} TCV</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revenue by Month */}
            {revenue?.by_month?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CalendarCheck className="h-4 w-4" /> Receita por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {revenue.by_month.map((m: any) => (
                      <div key={m.month} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{formatMonth(m.month)}</p>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-right text-xs">
                          <div><p className="text-muted-foreground">New</p><p className="font-medium text-emerald-600">{formatCurrency(m.new_mrr)}</p></div>
                          <div><p className="text-muted-foreground">Exp.</p><p className="font-medium text-primary">{formatCurrency(m.expansion_mrr)}</p></div>
                          <div><p className="text-muted-foreground">Churn</p><p className="font-medium text-destructive">{formatCurrency(m.churn_mrr)}</p></div>
                          <div><p className="text-muted-foreground">Net</p><p className={`font-semibold ${m.net_mrr >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>{formatCurrency(m.net_mrr)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Revenue by Owner (manager only) */}
            {isManager && revenue?.by_owner?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Receita por Responsável</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {revenue.by_owner.map((o: any) => (
                      <div key={o.owner_user_id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium font-mono text-muted-foreground">{o.owner_user_id.substring(0, 8)}...</p>
                          <p className="text-xs text-muted-foreground">{o.count} contrato{o.count > 1 ? 's' : ''} ganho{o.count > 1 ? 's' : ''}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-emerald-600">{formatCurrency(o.mrr)} MRR</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(o.tcv)} TCV</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Pending Activities (always visible) */}
      <Card>
        <CardHeader><CardTitle className="text-base font-semibold">Próximas Atividades</CardTitle></CardHeader>
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
    </div>
  );
}
