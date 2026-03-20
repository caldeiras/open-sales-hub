import { useState, useMemo } from 'react';
import { KPICard } from '@/components/sales/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, DollarSign, Users, Trophy, ArrowUpRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useGoals, useGoalPerformance, useRankingSummary, useUpsertGoal } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { PermissionGate } from '@/components/sales/PermissionGate';
import { toast } from 'sonner';

export default function GoalsPage() {
  const { user, hasAnyRole } = useSalesAuth();
  const isManager = hasAnyRole(['admin', 'gerente_comercial']);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  );

  const { data: goals = [], isLoading: goalsLoading } = useGoals({ period_month: selectedMonth });
  const { data: performance, isLoading: perfLoading } = useGoalPerformance(selectedMonth);
  const { data: ranking, isLoading: rankLoading } = useRankingSummary(selectedMonth);
  const upsertGoal = useUpsertGoal();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ owner_user_id: '', metric: 'mrr', target_value: '' });

  const formatCurrency = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  const formatValue = (v: number, metric: string) => {
    if (metric === 'mrr' || metric === 'tcv') return formatCurrency(v);
    return v.toString();
  };

  const metricLabels: Record<string, string> = {
    mrr: 'MRR', tcv: 'TCV', won_count: 'Contratos Ganhos', meetings: 'Reuniões', proposals: 'Propostas',
  };

  const performanceList = performance?.performance || [];

  const handleCreateGoal = async () => {
    if (!formData.owner_user_id || !formData.target_value) {
      toast.error('Preencha todos os campos');
      return;
    }
    try {
      await upsertGoal.mutateAsync({
        owner_user_id: formData.owner_user_id,
        period_month: selectedMonth,
        metric: formData.metric,
        target_value: Number(formData.target_value),
      });
      toast.success('Meta criada');
      setDialogOpen(false);
      setFormData({ owner_user_id: '', metric: 'mrr', target_value: '' });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Month selector
  const months = useMemo(() => {
    const result = [];
    for (let i = -2; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      result.push({
        value: d.toISOString().substring(0, 10),
        label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      });
    }
    return result;
  }, []);

  const isLoading = goalsLoading || perfLoading || rankLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Metas & Ranking</h1>
          <p className="text-sm text-muted-foreground">Acompanhamento de metas e performance comercial</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PermissionGate allowedRoles={['admin', 'gerente_comercial']}>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Nova Meta</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Criar Meta</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>ID do Vendedor</Label>
                    <Input value={formData.owner_user_id} onChange={(e) => setFormData({ ...formData, owner_user_id: e.target.value })} placeholder="UUID do vendedor" />
                  </div>
                  <div>
                    <Label>Métrica</Label>
                    <Select value={formData.metric} onValueChange={(v) => setFormData({ ...formData, metric: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(metricLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor Alvo</Label>
                    <Input type="number" value={formData.target_value} onChange={(e) => setFormData({ ...formData, target_value: e.target.value })} />
                  </div>
                  <Button onClick={handleCreateGoal} disabled={upsertGoal.isPending} className="w-full">
                    {upsertGoal.isPending ? 'Salvando...' : 'Salvar Meta'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </PermissionGate>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />)}
        </div>
      ) : (
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
          </TabsList>

          {/* PERFORMANCE TAB */}
          <TabsContent value="performance" className="space-y-6">
            {performanceList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Target className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Nenhuma meta definida para este período</p>
                  {isManager && <p className="text-sm mt-1">Clique em "Nova Meta" para criar</p>}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performanceList.map((g: any) => {
                  const pct = g.percent_achieved || 0;
                  return (
                    <Card key={g.id}>
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-muted-foreground">
                            {metricLabels[g.metric] || g.metric}
                          </p>
                          <span className={`text-xs font-semibold ${pct >= 100 ? 'text-[hsl(var(--success))]' : pct >= 70 ? 'text-[hsl(var(--warning))]' : 'text-destructive'}`}>
                            {pct}%
                          </span>
                        </div>
                        <Progress value={Math.min(pct, 100)} className="h-2" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">{formatValue(g.achieved_from_data, g.metric)}</span>
                          <span className="text-muted-foreground">de {formatValue(Number(g.target_value), g.metric)}</span>
                        </div>
                        {g.gap > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Falta: {formatValue(g.gap, g.metric)}
                          </p>
                        )}
                        {isManager && (
                          <p className="text-xs font-mono text-muted-foreground truncate">
                            {g.owner_user_id?.substring(0, 8)}...
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* RANKING TAB */}
          <TabsContent value="ranking" className="space-y-6">
            {!ranking?.ranking?.length ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Trophy className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Sem dados de ranking para este período</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {ranking.ranking.map((r: any, idx: number) => (
                  <Card key={r.owner_user_id}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-800' :
                          idx === 1 ? 'bg-slate-100 text-slate-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-800' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-mono text-muted-foreground">
                            {r.owner_user_id.substring(0, 8)}...
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{r.event_count} evento{r.event_count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-semibold text-[hsl(var(--success))]">
                            <ArrowUpRight className="h-3 w-3 inline mr-1" />
                            {formatCurrency(r.new_mrr)} New MRR
                          </p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(r.total_tcv)} TCV</p>
                          {r.commission_total > 0 && (
                            <p className="text-xs font-medium text-primary">{formatCurrency(r.commission_total)} comissão</p>
                          )}
                        </div>
                      </div>
                      {r.goals.length > 0 && (
                        <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-3 gap-2">
                          {r.goals.map((g: any) => (
                            <div key={g.metric} className="text-xs">
                              <span className="text-muted-foreground">{metricLabels[g.metric] || g.metric}: </span>
                              <span className={`font-medium ${g.pct >= 100 ? 'text-[hsl(var(--success))]' : g.pct >= 70 ? 'text-[hsl(var(--warning))]' : 'text-destructive'}`}>
                                {g.pct}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
