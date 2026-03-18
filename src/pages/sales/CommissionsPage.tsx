import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { DollarSign } from 'lucide-react';

// Commissions page - visual structure prepared for future integration
const mockCommissions = [
  { id: '1', opportunity: 'Projeto Alpha', beneficiary: 'João Silva', base: 'TCV', percentage: 5, predicted_value: 15000, status: 'pending' },
  { id: '2', opportunity: 'Contrato Beta Corp', beneficiary: 'Maria Santos', base: 'MRR', percentage: 10, predicted_value: 8000, status: 'approved' },
  { id: '3', opportunity: 'Expansão Gamma', beneficiary: 'João Silva', base: 'Setup', percentage: 3, predicted_value: 4500, status: 'pending' },
];

export default function CommissionsPage() {
  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

  const columns: Column<any>[] = [
    { key: 'opportunity', header: 'Oportunidade', render: (item) => <span className="font-medium">{item.opportunity}</span> },
    { key: 'beneficiary', header: 'Beneficiário' },
    { key: 'base', header: 'Base' },
    { key: 'percentage', header: '%', render: (item) => `${item.percentage}%`, className: 'text-right' },
    { key: 'predicted_value', header: 'Valor Previsto', render: (item) => formatCurrency(item.predicted_value), className: 'text-right' },
    { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status} /> },
  ];

  const totalPredicted = mockCommissions.reduce((s, c) => s + c.predicted_value, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comissão</h1>
        <p className="text-sm text-muted-foreground">Visão de comissões previstas</p>
        <p className="text-xs text-[hsl(var(--warning))] mt-1">⚠ Dados de exemplo — aguardando integração com motor de comissões</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[hsl(var(--success)/0.1)]">
                <DollarSign className="h-5 w-5 text-[hsl(var(--success))]" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Previsto</p>
                <p className="text-xl font-bold">{formatCurrency(totalPredicted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <DataTable data={mockCommissions} columns={columns} searchKeys={['opportunity', 'beneficiary']} searchPlaceholder="Buscar comissões..." />
    </div>
  );
}
