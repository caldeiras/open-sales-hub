import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, RefreshCw, AlertTriangle } from 'lucide-react';
import { useCommissions, useSyncCommissions } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { PermissionGate } from '@/components/sales/PermissionGate';
import { toast } from 'sonner';

export default function CommissionsPage() {
  const { hasAnyRole } = useSalesAuth();
  const isManager = hasAnyRole(['admin', 'gerente_comercial']);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  );

  const { data: commissions = [], isLoading } = useCommissions({ period_month: selectedMonth });
  const syncMutation = useSyncCommissions();

  const formatCurrency = (v: number) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const months = useMemo(() => {
    const result = [];
    for (let i = -5; i <= 1; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      result.push({
        value: d.toISOString().substring(0, 10),
        label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      });
    }
    return result;
  }, []);

  const handleSync = async () => {
    try {
      const result = await syncMutation.mutateAsync(selectedMonth);
      toast.success(`Sincronização concluída: ${result.synced} novos, ${result.skipped} já existentes`);
    } catch (err: any) {
      toast.error('Falha ao sincronizar: ' + err.message);
    }
  };

  const totalCommission = commissions.reduce((s: number, c: any) => s + (Number(c.commission_amount) || 0), 0);
  const coreCount = commissions.filter((c: any) => c.source === 'core').length;
  const manualCount = commissions.filter((c: any) => c.source === 'manual').length;

  const columns: Column<any>[] = [
    {
      key: 'owner_user_id', header: 'Vendedor',
      render: (item) => <span className="font-mono text-xs">{item.owner_user_id?.substring(0, 8)}...</span>,
    },
    { key: 'commission_type', header: 'Tipo', render: (item) => <StatusBadge status={item.commission_type || 'n/a'} /> },
    { key: 'commission_amount', header: 'Valor', render: (item) => formatCurrency(item.commission_amount), className: 'text-right' },
    { key: 'source', header: 'Fonte', render: (item) => (
      <span className={`text-xs px-2 py-0.5 rounded ${item.source === 'core' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {item.source}
      </span>
    )},
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    {
      key: 'is_manual_adjustment', header: 'Ajuste',
      render: (item) => item.is_manual_adjustment ? <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--warning))]" /> : null,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Espelho de comissões sincronizadas do CORE
          </p>
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
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncMutation.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sincronizar CORE
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[hsl(var(--success)/0.1)]">
                <DollarSign className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total do Período</p>
                <p className="text-xl font-bold">{formatCurrency(totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vindas do CORE</p>
                <p className="text-xl font-bold">{coreCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-muted">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ajustes Manuais</p>
                <p className="text-xl font-bold">{manualCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
      ) : commissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma comissão encontrada</p>
            {isManager && <p className="text-sm mt-1">Clique em "Sincronizar CORE" para importar</p>}
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={commissions}
          columns={columns}
          searchKeys={['owner_user_id', 'commission_type']}
          searchPlaceholder="Buscar comissões..."
        />
      )}
    </div>
  );
}
