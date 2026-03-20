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
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Search, Users, Key, Lock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RbacPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [assignDialog, setAssignDialog] = useState(false);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRoleName, setAssignRoleName] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: fetchRoles,
  });

  const { data: permissions = [], isLoading: permsLoading } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: fetchPermissions,
  });

  const { data: usersRoles = [], isLoading: usersLoading } = useQuery({
    queryKey: ['rbac-users-roles'],
    queryFn: fetchUsersWithRoles,
  });

  const { data: rolePerms = [] } = useQuery({
    queryKey: ['rbac-role-permissions', selectedRoleId],
    queryFn: () => fetchRolePermissions(selectedRoleId!),
    enabled: !!selectedRoleId,
  });

  const assignMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => assignRole(userId, role),
    onSuccess: () => {
      toast({ title: 'Papel atribuído com sucesso' });
      qc.invalidateQueries({ queryKey: ['rbac-users-roles'] });
      setAssignDialog(false);
      setAssignUserId('');
      setAssignRoleName('');
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const removeMut = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) => removeRole(userId, role),
    onSuccess: () => {
      toast({ title: 'Papel removido' });
      qc.invalidateQueries({ queryKey: ['rbac-users-roles'] });
    },
    onError: (err: any) => toast({ title: 'Erro', description: err.message, variant: 'destructive' }),
  });

  const filteredUsers = usersRoles.filter((u: any) =>
    !search || u.user_id?.toLowerCase().includes(search.toLowerCase())
  );

  const moduleGroups = permissions.reduce((acc: Record<string, any[]>, p: any) => {
    const mod = p.module || 'other';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
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

      <Tabs defaultValue="users">
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
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por user_id..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum usuário com papéis atribuídos</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setAssignDialog(true)}>
                  Atribuir primeiro papel
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((u: any) => (
                <Card key={u.user_id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-foreground">{u.user_id}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {u.roles?.map((r: any) => (
                          <Badge
                            key={r.name}
                            variant={r.name === 'admin' ? 'default' : 'secondary'}
                            className="gap-1"
                          >
                            {r.label || r.name}
                            <button
                              className="ml-0.5 hover:text-destructive"
                              onClick={() => removeMut.mutate({ userId: u.user_id, role: r.name })}
                              title="Remover papel"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== ROLES TAB ===== */}
        <TabsContent value="roles" className="space-y-4">
          {rolesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role: any) => (
                <Card
                  key={role.id}
                  className={`cursor-pointer transition-colors ${selectedRoleId === role.id ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedRoleId(selectedRoleId === role.id ? null : role.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{role.label}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{role.name}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">{role.description || '—'}</p>
                    {role.module_scope && (
                      <Badge variant="secondary" className="mt-2 text-[10px]">{role.module_scope}</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedRoleId && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Permissões do papel: {roles.find((r: any) => r.id === selectedRoleId)?.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {rolePerms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma permissão atribuída</p>
                  ) : (
                    rolePerms.map((p: any) => (
                      <Badge key={p.key} variant="outline" className="text-xs font-mono">
                        {p.key}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== PERMISSIONS TAB ===== */}
        <TabsContent value="permissions" className="space-y-4">
          {permsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            Object.entries(moduleGroups).map(([mod, perms]) => (
              <Card key={mod}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm capitalize">{mod}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {(perms as any[]).map((p) => (
                      <Badge key={p.key} variant="outline" className="text-xs font-mono" title={p.description}>
                        {p.key}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
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
              <Select value={assignRoleName} onValueChange={setAssignRoleName}>
                <SelectTrigger><SelectValue placeholder="Selecionar papel" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r: any) => (
                    <SelectItem key={r.name} value={r.name}>
                      {r.label} ({r.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => assignMut.mutate({ userId: assignUserId, role: assignRoleName })}
              disabled={!assignUserId || !assignRoleName || assignMut.isPending}
            >
              {assignMut.isPending ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
