import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/sales/DataTable';
import { useAccountOwnerships, useTransferAccount, useAccounts } from '@/hooks/useSalesData';
import { useSalesAuth } from '@/contexts/SalesAuthContext';
import { PermissionGate } from '@/components/sales/PermissionGate';
import { Briefcase, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function PortfolioPage() {
  const { hasAnyRole } = useSalesAuth();
  const isManager = hasAnyRole(['admin', 'gerente_comercial']);

  const { data: ownerships = [], isLoading } = useAccountOwnerships();
  const { data: accounts = [] } = useAccounts();
  const transferMutation = useTransferAccount();

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ account_id: '', new_owner_user_id: '', reason: '' });

  const handleTransfer = async () => {
    if (!transferForm.account_id || !transferForm.new_owner_user_id) {
      toast.error('Conta e novo responsável obrigatórios');
      return;
    }
    try {
      await transferMutation.mutateAsync(transferForm);
      toast.success('Conta transferida com sucesso');
      setTransferOpen(false);
      setTransferForm({ account_id: '', new_owner_user_id: '', reason: '' });
    } catch (err: any) { toast.error(err.message); }
  };

  // Enrich ownerships with account name
  const enriched = ownerships.map((o: any) => {
    const acc = accounts.find((a: any) => a.id === o.account_id);
    return { ...o, account_name: acc?.name || acc?.company_name || o.account_id?.substring(0, 8) + '...' };
  });

  const columns: Column<any>[] = [
    { key: 'account_name', header: 'Conta', render: (item) => <span className="font-medium">{item.account_name}</span> },
    { key: 'owner_user_id', header: 'Responsável', render: (item) => <span className="font-mono text-xs">{item.owner_user_id?.substring(0, 8)}...</span> },
    {
      key: 'assigned_at', header: 'Desde',
      render: (item) => <span className="text-sm text-muted-foreground">{item.assigned_at ? new Date(item.assigned_at).toLocaleDateString('pt-BR') : '—'}</span>,
    },
    {
      key: 'transferred_from', header: 'Anterior',
      render: (item) => item.transferred_from
        ? <span className="font-mono text-xs text-muted-foreground">{item.transferred_from.substring(0, 8)}...</span>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
    { key: 'transfer_reason', header: 'Motivo', render: (item) => <span className="text-sm text-muted-foreground">{item.transfer_reason || '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Carteira de Clientes</h1>
          <p className="text-sm text-muted-foreground">Ownership de contas e histórico de transferências</p>
        </div>
        <PermissionGate allowedRoles={['admin', 'gerente_comercial']}>
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <ArrowRightLeft className="h-4 w-4 mr-1" /> Transferir Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferir Conta</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>ID da Conta</Label>
                  <Input value={transferForm.account_id} onChange={(e) => setTransferForm({ ...transferForm, account_id: e.target.value })} placeholder="UUID da conta" />
                </div>
                <div>
                  <Label>Novo Responsável</Label>
                  <Input value={transferForm.new_owner_user_id} onChange={(e) => setTransferForm({ ...transferForm, new_owner_user_id: e.target.value })} placeholder="UUID do novo owner" />
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Input value={transferForm.reason} onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })} placeholder="Ex: mudança de território" />
                </div>
                <Button onClick={handleTransfer} disabled={transferMutation.isPending} className="w-full">
                  {transferMutation.isPending ? 'Transferindo...' : 'Confirmar Transferência'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
      ) : enriched.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma atribuição de conta encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable data={enriched} columns={columns} searchKeys={['account_name', 'owner_user_id']} searchPlaceholder="Buscar contas..." />
      )}
    </div>
  );
}
