import { useOpportunities } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge, StageBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OpportunitiesPage() {
  const { data: opportunities = [], isLoading } = useOpportunities();
  const navigate = useNavigate();

  const formatCurrency = (v: number) => v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';

  const columns: Column<any>[] = [
    { key: 'title', header: 'Oportunidade', sortable: true, render: (item) => <span className="font-medium">{item.title}</span> },
    { key: 'account', header: 'Empresa', render: (item) => item.account?.company_name || '—', sortable: true },
    { key: 'stage', header: 'Etapa', render: (item) => item.stage ? <StageBadge stage={item.stage.stage_name} color={item.stage.color} /> : '—' },
    { key: 'pipeline_status', header: 'Status', render: (item) => <StatusBadge status={item.pipeline_status} /> },
    { key: 'estimated_mrr', header: 'MRR', render: (item) => formatCurrency(item.estimated_mrr), className: 'text-right' },
    { key: 'estimated_tcv', header: 'TCV', render: (item) => formatCurrency(item.estimated_tcv), className: 'text-right' },
    { key: 'probability', header: '%', render: (item) => item.probability ? `${item.probability}%` : '—', className: 'text-right' },
    { key: 'expected_close_date', header: 'Previsão', sortable: true, render: (item) => item.expected_close_date ? new Date(item.expected_close_date).toLocaleDateString('pt-BR') : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Oportunidades</h1>
          <p className="text-sm text-muted-foreground">Centro de execução comercial</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Oportunidade</Button>
      </div>
      <DataTable data={opportunities} columns={columns} searchKeys={['title']} searchPlaceholder="Buscar oportunidades..." onRowClick={(item) => navigate(`/opportunities/${item.id}`)} loading={isLoading} />
    </div>
  );
}
