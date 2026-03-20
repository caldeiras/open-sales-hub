import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRoles, fetchPermissions, fetchUsersWithRoles,
  fetchRolePermissions, assignRole, removeRole,
} from '@/services/rbacService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Users, Key, Lock, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch { return '—'; }
}

function truncateUuid(uuid: string) {
  if (!uuid || uuid.length < 12) return uuid || '—';
  return `${uuid.slice(0, 8)}…${uuid.slice(-4)}`;
}

export default function RbacPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('users');
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRoleId, setAssignRoleId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  // ===== QUERIES =====
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: fetchRoles,
    enabled: activeTab === 'roles' || assignDialog,
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: fetchPermissions,
    enabled: activeTab === 'permissions',
  });

  const { data: usersRoles = [], isLoading: usersLoading } = useQuery({
    queryKey: ['rbac-users-roles'],
    queryFn: fetchUsersWithRoles,
    enabled: activeTab === 'users',
  });

  const { data: rolePerms = [] } = useQuery({
    queryKey: ['rbac-role-permissions', selectedRoleId],
    queryFn: () => fetchRolePermissions(selectedRoleId!),
    enabled: !!selectedRoleId,
  });

  // Roles for assign dialog
  const { data: assignRoles = [] } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: fetchRoles,
    enabled: assignDialog,
  });

  // ===== MUTATIONS =====
  const assignMut = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignRole(userId, roleId),
    onSuccess: () => {
      toast({ title: 'Papel atribuído com sucesso' });
      qc.invalidateQueries({ queryKey: ['rbac-users-roles'] });
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      setAssignDialog(false);
      setAssignUserId('');
      setAssignRoleId('');
    },
    onError: (err: any) =>
      toast({ title: 'Erro ao atribuir papel', description: err.message, variant: 'destructive' }),
  });

  const removeMut = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      removeRole(userId, roleId),
    onSuccess: () => {
      toast({ title: 'Papel removido' });
      qc.invalidateQueries({ queryKey: ['rbac-users-roles'] });
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
    },
    onError: (err: any) =>
      toast({ title: 'Erro ao remover papel', description: err.message, variant: 'destructive' }),
  });

  // ===== GROUP PERMISSIONS BY MODULE =====
  const moduleGroups = permissions.reduce((acc: Record<string, any[]>, p: any) => {
    const mod = p.module || 'other';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  const TableSkeleton = () => (
    <div className="space-y-2">
      {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" /> Controle de Acesso (RBAC)
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie papéis, permissões e atribuições de usuários
          </p>
        </div>
        <Button size="sm" onClick={() => setAssignDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> Atribuir Papel
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5">
            <Key className="h-3.5 w-3.5" /> Papéis
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Permissões
          </TabsTrigger>
        </TabsList>

        {/* ===== USERS TAB ===== */}
        <TabsContent value="users" className="space-y-4">
          {usersLoading ? <TableSkeleton /> : usersRoles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum usuário com papel atribuído</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setAssignDialog(true)}>
                  Atribuir primeiro papel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Atribuído em</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersRoles.map((u: any) =>
                    u.roles?.map((r: any, idx: number) => (
                      <TableRow key={`${u.user_id}-${r.id || r.name}-${idx}`}>
                        <TableCell className="font-mono text-xs" title={u.user_id}>
                          {truncateUuid(u.user_id)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.name === 'admin' ? 'default' : 'secondary'}>
                            {r.label || r.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {r.level ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(r.assigned_at)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeMut.mutate({ userId: u.user_id, roleId: r.id })}
                            disabled={removeMut.isPending}
                            title="Remover papel"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ===== ROLES TAB ===== */}
        <TabsContent value="roles" className="space-y-4">
          {rolesLoading ? <TableSkeleton /> : roles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Key className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum papel cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Nível</TableHead>
                      <TableHead>Permissões</TableHead>
                      <TableHead>Usuários</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role: any) => (
                      <TableRow
                        key={role.id}
                        className={`cursor-pointer ${selectedRoleId === role.id ? 'bg-muted' : ''}`}
                        onClick={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{role.label || role.name}</span>
                            <Badge variant="outline" className="font-mono text-[10px]">{role.name}</Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{role.level ?? '—'}</TableCell>
                        <TableCell className="text-sm">{role.permission_count ?? 0}</TableCell>
                        <TableCell className="text-sm">{role.user_count ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(role.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Editar (em breve)">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Selected role permissions */}
              {selectedRoleId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Permissões do papel: {roles.find((r: any) => r.id === selectedRoleId)?.label || '—'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {rolePerms.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma permissão atribuída</p>
                      ) : (
                        rolePerms.map((p: any, idx: number) => (
                          <Badge key={p.key || p.permission_name || idx} variant="outline" className="text-xs font-mono">
                            {p.key || p.permission_name || p.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ===== PERMISSIONS TAB ===== */}
        <TabsContent value="permissions" className="space-y-4">
          {permsLoading ? <TableSkeleton /> : Object.keys(moduleGroups).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Lock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma permissão cadastrada</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Accordion type="multiple" defaultValue={Object.keys(moduleGroups)} className="px-4">
                {Object.entries(moduleGroups).map(([mod, perms]) => (
                  <AccordionItem key={mod} value={mod}>
                    <AccordionTrigger className="text-sm font-medium capitalize">
                      {mod} <Badge variant="secondary" className="ml-2 text-[10px]">{(perms as any[]).length}</Badge>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Módulo</TableHead>
                            <TableHead>Descrição</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(perms as any[]).map((p) => (
                            <TableRow key={p.key || p.id}>
                              <TableCell className="font-mono text-xs">{p.key || p.name}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">{p.module}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.description || p.label || '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== ASSIGN DIALOG ===== */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Papel a Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="assign-user-id">User ID (UUID)</Label>
              <Input
                id="assign-user-id"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Papel</Label>
              <Select value={assignRoleId} onValueChange={setAssignRoleId}>
                <SelectTrigger><SelectValue placeholder="Selecionar papel" /></SelectTrigger>
                <SelectContent>
                  {assignRoles.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label || r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => assignMut.mutate({ userId: assignUserId, roleId: assignRoleId })}
              disabled={!assignUserId || !assignRoleId || assignMut.isPending}
            >
              {assignMut.isPending ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
