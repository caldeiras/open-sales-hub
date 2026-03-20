import { useState } from 'react';
import { useContacts, useUpsertContact, useAccounts } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil } from 'lucide-react';

export default function ContactsPage() {
  const { data: contacts = [], isLoading } = useContacts();
  const { data: accounts = [] } = useAccounts();
  const upsert = useUpsertContact();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditing(item); setDialogOpen(true); };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: any = {
      account_id: fd.get('account_id'),
      full_name: fd.get('full_name'),
      email: fd.get('email') || null,
      phone: fd.get('phone') || null,
      job_title: fd.get('job_title') || null,
      is_primary: fd.get('is_primary') === 'on',
    };
    if (editing?.id) payload.id = editing.id;

    try {
      await upsert.mutateAsync(payload);
      toast({ title: editing ? 'Contato atualizado' : 'Contato criado' });
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const columns: Column<any>[] = [
    { key: 'full_name', header: 'Nome', sortable: true, render: (item) => <span className="font-medium">{item.full_name}</span> },
    { key: 'account', header: 'Empresa', render: (item) => item.account?.name || '—' },
    { key: 'job_title', header: 'Cargo' },
    { key: 'email', header: 'E-mail' },
    { key: 'phone', header: 'Telefone' },
    { key: 'is_primary', header: 'Principal', render: (item) => item.is_primary ? <Badge variant="secondary" className="text-[10px]">Principal</Badge> : '—' },
    { key: 'actions', header: '', className: 'w-10', render: (item) => (
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(item); }}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
    )},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground">Contatos de empresas clientes</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Contato</Button>
      </div>
      <DataTable data={contacts} columns={columns} searchKeys={['full_name', 'email', 'job_title']} searchPlaceholder="Buscar contatos..." loading={isLoading} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Contato' : 'Novo Contato'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-2">
                <Label>Empresa *</Label>
                <Select name="account_id" required defaultValue={editing?.account_id || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Nome completo *</Label>
                <Input id="full_name" name="full_name" required defaultValue={editing?.full_name || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="job_title">Cargo</Label>
                <Input id="job_title" name="job_title" defaultValue={editing?.job_title || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={editing?.email || ''} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" defaultValue={editing?.phone || ''} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="is_primary" name="is_primary" defaultChecked={editing?.is_primary || false} />
              <Label htmlFor="is_primary" className="text-sm">Contato principal</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={upsert.isPending}>{upsert.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
