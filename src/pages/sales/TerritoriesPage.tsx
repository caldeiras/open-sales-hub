import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { useTerritories, useUpsertTerritory, useTerritoryAssignments } from '@/hooks/useSalesData';
import { PermissionGate } from '@/components/sales/PermissionGate';
import { Map } from 'lucide-react';
import { toast } from 'sonner';

export default function TerritoriesPage() {
  const { data: territories = [], isLoading } = useTerritories();
  const { data: assignments = [] } = useTerritoryAssignments();
  const upsertTerritory = useUpsertTerritory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'region', description: '' });

  const handleCreate = async () => {
    if (!form.name) { toast.error('Nome obrigatório'); return; }
    try {
      await upsertTerritory.mutateAsync({ name: form.name, type: form.type, description: form.description });
      toast.success('Território criado');
      setDialogOpen(false);
      setForm({ name: '', type: 'region', description: '' });
    } catch (err: any) { toast.error(err.message); }
  };

  const typeLabels: Record<string, string> = { region: 'Região', segment: 'Segmento', account_list: 'Lista de Contas' };

  const columns: Column<any>[] = [
    { key: 'name', header: 'Território', render: (item) => <span className="font-medium">{item.name}</span> },
    { key: 'type', header: 'Tipo', render: (item) => <StatusBadge status={typeLabels[item.type] || item.type} /> },
    { key: 'description', header: 'Descrição', render: (item) => <span className="text-muted-foreground text-sm">{item.description || '—'}</span> },
    {
      key: 'assignments', header: 'Atribuídos',
      render: (item) => {
        const count = assignments.filter((a: any) => a.territory_id === item.id && a.active).length;
        return <span className="text-sm">{count} vendedor{count !== 1 ? 'es' : ''}</span>;
      },
    },
    { key: 'active', header: 'Status', render: (item) => <StatusBadge status={item.active ? 'active' : 'inactive'} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Territórios</h1>
          <p className="text-sm text-muted-foreground">Regiões, segmentos e listas de contas</p>
        </div>
        <PermissionGate allowedRoles={['admin', 'gerente_comercial']}>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button size="sm">Novo Território</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar Território</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="region">Região</SelectItem>
                      <SelectItem value="segment">Segmento</SelectItem>
                      <SelectItem value="account_list">Lista de Contas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <Button onClick={handleCreate} disabled={upsertTerritory.isPending} className="w-full">
                  {upsertTerritory.isPending ? 'Salvando...' : 'Criar Território'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PermissionGate>
      </div>

      {isLoading ? (
        <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
      ) : territories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Map className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhum território cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <DataTable data={territories} columns={columns} searchKeys={['name', 'type']} searchPlaceholder="Buscar territórios..." />
      )}
    </div>
  );
}
