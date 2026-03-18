import { useAccounts } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AccountsPage() {
  const { data: accounts = [], isLoading } = useAccounts();
  const navigate = useNavigate();

  const columns: Column<any>[] = [
    { key: 'company_name', header: 'Empresa', sortable: true, render: (item) => <span className="font-medium">{item.company_name}</span> },
    { key: 'trade_name', header: 'Nome Fantasia', sortable: true },
    { key: 'cnpj', header: 'CNPJ' },
    { key: 'city', header: 'Cidade', sortable: true },
    { key: 'state', header: 'UF', className: 'w-16' },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">Contas e empresas clientes</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Empresa</Button>
      </div>
      <DataTable data={accounts} columns={columns} searchKeys={['company_name', 'trade_name', 'cnpj', 'city']} searchPlaceholder="Buscar empresas..." onRowClick={(item) => navigate(`/accounts/${item.id}`)} loading={isLoading} />
    </div>
  );
}
