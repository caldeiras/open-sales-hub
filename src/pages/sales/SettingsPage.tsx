import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePipelineStages, useLeadSources, useSegments, useLossReasons, useTags } from '@/hooks/useSalesData';
import { DataTable, Column } from '@/components/sales/DataTable';
import { StatusBadge } from '@/components/sales/StatusBadge';
import { PermissionGate } from '@/components/sales/PermissionGate';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function SettingsPage() {
  const { data: stages = [], isLoading: loadingStages } = usePipelineStages();
  const { data: sources = [], isLoading: loadingSources } = useLeadSources();
  const { data: segments = [], isLoading: loadingSegments } = useSegments();
  const { data: lossReasons = [], isLoading: loadingLoss } = useLossReasons();
  const { data: tags = [], isLoading: loadingTags } = useTags();

  const stageColumns: Column<any>[] = [
    { key: 'stage_order', header: '#', className: 'w-12' },
    { key: 'stage_name', header: 'Etapa', render: (item) => <span className="font-medium">{item.stage_name}</span> },
    { key: 'stage_code', header: 'Código' },
    { key: 'color', header: 'Cor', render: (item) => item.color ? <div className="w-6 h-6 rounded" style={{ backgroundColor: item.color }} /> : '—' },
    { key: 'is_active', header: 'Ativo', render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} /> },
  ];

  const sourceColumns: Column<any>[] = [
    { key: 'source_name', header: 'Origem', render: (item) => <span className="font-medium">{item.source_name}</span> },
    { key: 'source_code', header: 'Código' },
    { key: 'is_active', header: 'Ativo', render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} /> },
  ];

  const segmentColumns: Column<any>[] = [
    { key: 'segment_name', header: 'Segmento', render: (item) => <span className="font-medium">{item.segment_name}</span> },
    { key: 'segment_code', header: 'Código' },
    { key: 'is_active', header: 'Ativo', render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} /> },
  ];

  const lossColumns: Column<any>[] = [
    { key: 'reason_name', header: 'Motivo', render: (item) => <span className="font-medium">{item.reason_name}</span> },
    { key: 'reason_code', header: 'Código' },
    { key: 'is_active', header: 'Ativo', render: (item) => <StatusBadge status={item.is_active ? 'active' : 'inactive'} /> },
  ];

  const tagColumns: Column<any>[] = [
    { key: 'tag_name', header: 'Tag', render: (item) => <span className="font-medium">{item.tag_name}</span> },
    { key: 'color', header: 'Cor', render: (item) => item.color ? <div className="w-6 h-6 rounded" style={{ backgroundColor: item.color }} /> : '—' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Parâmetros do sistema comercial</p>
      </div>

      <Tabs defaultValue="stages">
        <TabsList className="flex-wrap">
          <TabsTrigger value="stages">Etapas do Pipeline</TabsTrigger>
          <TabsTrigger value="sources">Origens</TabsTrigger>
          <TabsTrigger value="segments">Segmentos</TabsTrigger>
          <TabsTrigger value="loss">Motivos de Perda</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
        </TabsList>

        <TabsContent value="stages">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Etapas do Pipeline</CardTitle>
              <PermissionGate permissionKey="settings.manage">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Etapa</Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              <DataTable data={stages} columns={stageColumns} loading={loadingStages} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Origens de Lead</CardTitle>
              <PermissionGate permissionKey="settings.manage">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Origem</Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              <DataTable data={sources} columns={sourceColumns} loading={loadingSources} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Segmentos</CardTitle>
              <PermissionGate permissionKey="settings.manage">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Segmento</Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              <DataTable data={segments} columns={segmentColumns} loading={loadingSegments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loss">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Motivos de Perda</CardTitle>
              <PermissionGate permissionKey="settings.manage">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Novo Motivo</Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              <DataTable data={lossReasons} columns={lossColumns} loading={loadingLoss} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Tags</CardTitle>
              <PermissionGate permissionKey="settings.manage">
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nova Tag</Button>
              </PermissionGate>
            </CardHeader>
            <CardContent>
              <DataTable data={tags} columns={tagColumns} loading={loadingTags} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
