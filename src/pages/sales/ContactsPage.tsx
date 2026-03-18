import { useContacts } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContactsPage() {
  const { data: contacts = [], isLoading } = useContacts();
  const navigate = useNavigate();

  const columns: Column<any>[] = [
    { key: 'first_name', header: 'Nome', sortable: true, render: (item) => <span className="font-medium">{item.first_name} {item.last_name || ''}</span> },
    { key: 'account', header: 'Empresa', render: (item) => item.account?.company_name || '—' },
    { key: 'job_title', header: 'Cargo' },
    { key: 'email', header: 'E-mail' },
    { key: 'phone', header: 'Telefone' },
    { key: 'is_primary', header: 'Principal', render: (item) => item.is_primary ? <Badge variant="secondary" className="text-[10px]">Principal</Badge> : '—' },
    { key: 'influence_level', header: 'Influência' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground">Contatos de empresas clientes</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Contato</Button>
      </div>
      <DataTable data={contacts} columns={columns} searchKeys={['first_name', 'last_name', 'email', 'job_title']} searchPlaceholder="Buscar contatos..." onRowClick={(item) => navigate(`/contacts/${item.id}`)} loading={isLoading} />
    </div>
  );
}
