import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { KPICard } from '@/components/sales/KPICard';
import { useTeams, useUpsertTeam, useTeamSummary } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { PermissionGate } from '@/components/sales/PermissionGate';
import { Users, DollarSign, Building2, Target } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamsPage() {
  const { hasAnyRole } = useSalesAuth();
  const isManager = hasAnyRole(['admin', 'gerente_comercial']);

  const { data: teams = [], isLoading } = useTeams();
  const { data: summaries = [] } = useTeamSummary();
  const upsertTeam = useUpsertTeam();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', manager_user_id: '' });

  const formatCurrency = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;

  const handleCreate = async () => {
    if (!form.name || !form.manager_user_id) { toast.error('Nome e Gerente obrigatórios'); return; }
    try {
      await upsertTeam.mutateAsync({ name: form.name, description: form.description, manager_user_id: form.manager_user_id });
      toast.success('Time criado');
      setDialogOpen(false);
      setForm({ name: '', description: '', manager_user_id: '' });
    } catch (err: any) { toast.error(err.message); }
  };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Time', render: (item) => <span className="font-medium">{item.name}</span> },
    { key: 'description', header: 'Descrição', render: (item) => <span className="text-muted-foreground text-sm">{item.description || '—'}</span> },
    { key: 'manager_user_id', header: 'Gerente', render: (item) => <span className="font-mono text-xs">{item.manager_user_id?.substring(0, 8)}...</span> },
    { key: 'active', header: 'Status', render: (item) => <StatusBadge status={item.active ? 'active' : 'inactive'} /> },
  ];

  // Summary KPIs
  const totalMembers = summaries.reduce((s: number, t: any) => s + (t.member_count || 0), 0);
  const totalAccounts = summaries.reduce((s: number, t: any) => s + (t.account_count || 0), 0);
  const totalMRR = summaries.reduce((s: number, t: any) => s + (t.total_mrr || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Times Comerciais</h1>
          <p className="text-sm text-muted-foreground">Estrutura organizacional da equipe de vendas</p>
        </div>
        <PermissionGate allowedRoles={['admin', 'gerente_comercial']}>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm">Novo Time</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Time</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>ID do Gerente</Label><Input value={form.manager_user_id} onChange={(e) => setForm({ ...form, manager_user_id: e.target.value })} placeholder="UUID" /></div>
                <Button onClick={handleCreate} disabled={upsertTeam.isPending} className="w-full">
                  {upsertTeam.isPending ? 'Salvando...' : 'Criar Time'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {isManager && summaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <KPICard title="Times Ativos" value={teams.filter((t: any) => t.active).length} icon={Users} variant="info" />
          <KPICard title="Total Membros" value={totalMembers} icon={Users} variant="default" />
          <KPICard title="Contas Gerenciadas" value={totalAccounts} icon={Building2} variant="default" />
          <KPICard title="MRR do Time" value={formatCurrency(totalMRR)} icon={DollarSign} variant="success" />
        </div>
      )}

      {/* Team summaries */}
      {isManager && summaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {summaries.map((s: any) => (
            <Card key={s.team_id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{s.team_name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground text-xs">Membros</p><p className="font-semibold">{s.member_count}</p></div>
                  <div><p className="text-muted-foreground text-xs">Contas</p><p className="font-semibold">{s.account_count}</p></div>
                  <div><p className="text-muted-foreground text-xs">MRR</p><p className="font-semibold text-[hsl(var(--success))]">{formatCurrency(s.total_mrr)}</p></div>
                  <div><p className="text-muted-foreground text-xs">Contratos Ganhos</p><p className="font-semibold">{s.won_opportunities}</p></div>
                </div>
                {s.members?.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Membros:</p>
                    <div className="flex flex-wrap gap-1">
                      {s.members.map((m: any) => (
                        <span key={m.user_id} className="text-xs px-2 py-0.5 rounded bg-muted">
                          {m.user_id.substring(0, 6)}... ({m.role})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
      ) : (
        <DataTable data={teams} columns={columns} searchKeys={['name']} searchPlaceholder="Buscar times..." />
      )}
    </div>
  );
}
