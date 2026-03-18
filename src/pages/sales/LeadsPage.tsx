import { useLeads } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LeadsPage() {
  const { data: leads = [], isLoading } = useLeads();
  const navigate = useNavigate();

  const columns: Column<any>[] = [
    { key: 'company_name', header: 'Empresa', sortable: true, render: (item) => <span className="font-medium">{item.company_name || '—'}</span> },
    { key: 'contact_name', header: 'Contato', sortable: true },
    { key: 'contact_email', header: 'E-mail' },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    { key: 'temperature', header: 'Temperatura', render: (item) => item.temperature ? <StatusBadge status={item.temperature} /> : '—' },
    { key: 'created_at', header: 'Criado em', sortable: true, render: (item) => new Date(item.created_at).toLocaleDateString('pt-BR') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de leads comerciais</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Novo Lead
        </Button>
      </div>

      <DataTable
        data={leads}
        columns={columns}
        searchKeys={['company_name', 'contact_name', 'contact_email']}
        searchPlaceholder="Buscar leads..."
        onRowClick={(item) => navigate(`/leads/${item.id}`)}
        loading={isLoading}
        emptyMessage="Nenhum lead encontrado"
      />
    </div>
  );
}
