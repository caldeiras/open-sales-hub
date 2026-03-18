import { useProposals } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { Button } from '@/components/ui/button';
import { Plus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProposalsPage() {
  const { data: proposals = [], isLoading } = useProposals();
  const navigate = useNavigate();

  const formatCurrency = (v: number) => v ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '—';

  const columns: Column<any>[] = [
    { key: 'proposal_number', header: 'Número', sortable: true, render: (item) => <span className="font-medium">{item.proposal_number || '—'}</span> },
    { key: 'opportunity', header: 'Oportunidade', render: (item) => item.opportunity?.title || '—' },
    { key: 'account', header: 'Empresa', render: (item) => item.opportunity?.account?.company_name || '—' },
    { key: 'monthly_value', header: 'Mensal', render: (item) => formatCurrency(item.monthly_value), className: 'text-right' },
    { key: 'tcv', header: 'TCV', render: (item) => formatCurrency(item.tcv), className: 'text-right' },
    { key: 'contract_term_months', header: 'Prazo', render: (item) => item.contract_term_months ? `${item.contract_term_months} meses` : '—' },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
    { key: 'sent_at', header: 'Enviada em', render: (item) => item.sent_at ? new Date(item.sent_at).toLocaleDateString('pt-BR') : '—' },
    { key: 'actions', header: '', render: (item) => item.external_url ? (
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(item.external_url, '_blank'); }}>
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
    ) : null },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Propostas</h1>
          <p className="text-sm text-muted-foreground">Propostas vinculadas às oportunidades</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Vincular Proposta</Button>
      </div>
      <DataTable data={proposals} columns={columns} searchKeys={['proposal_number']} searchPlaceholder="Buscar propostas..." onRowClick={(item) => navigate(`/proposals/${item.id}`)} loading={isLoading} />
    </div>
  );
}
