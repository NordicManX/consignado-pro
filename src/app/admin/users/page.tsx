'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Trash2, Shield, Loader2, Pencil, Save, ShieldAlert, User } from 'lucide-react'
import { toast } from "sonner"
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { supabase } from '@/src/lib/supabase'

// Suas actions de servidor (certifique-se que elas aceitam o campo 'role')
import { createSystemUser, listSystemUsers, deleteSystemUser, updateSystemUser } from '../../actions/admin-auth'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch' // <--- 1. Importando Switch
import { Badge } from '@/components/ui/badge'   // <--- 2. Importando Badge

export default function UsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Controle do Modal
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form States
    const [newName, setNewName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [isAdmin, setIsAdmin] = useState(false) // <--- 3. Novo Estado para Admin
    const [saving, setSaving] = useState(false)

    // Proteção de Rota (Só Admin pode ver essa tela)
    useEffect(() => {
        async function checkPermission() {
            const { data: { user } } = await supabase.auth.getUser()
            // Verifica se a role no metadata é 'admin'
            if (user?.user_metadata?.role !== 'admin') {
                toast.error('Acesso negado.')
                router.push('/')
            }
        }
        checkPermission()
    }, [router])

    // Carregar Usuários
    async function loadUsers() {
        setLoading(true)
        const data = await listSystemUsers()
        setUsers(data || [])
        setLoading(false)
    }

    useEffect(() => {
        loadUsers()
    }, [])

    // Abrir modal para CRIAR
    const handleOpenCreate = () => {
        setEditingId(null)
        setNewName('')
        setNewEmail('')
        setNewPassword('')
        setIsAdmin(false) // Padrão: Não é admin
        setIsDialogOpen(true)
    }

    // Abrir modal para EDITAR
    const handleOpenEdit = (user: any) => {
        setEditingId(user.id)
        setNewName(user.user_metadata?.full_name || '')
        setNewEmail(user.email || '')
        setNewPassword('')
        // Verifica se o usuário já é admin olhando os metadados
        setIsAdmin(user.user_metadata?.role === 'admin')
        setIsDialogOpen(true)
    }

    // Salvar (Cria ou Atualiza)
    const handleSave = async () => {
        if (!newEmail || !newName) return toast.error('Nome e Email são obrigatórios')

        if (!editingId && (!newPassword || newPassword.length < 6)) {
            return toast.error('Senha deve ter 6+ caracteres na criação')
        }

        setSaving(true)

        // Define a role baseado no switch
        const roleToSave = isAdmin ? 'admin' : 'user'

        let result
        if (editingId) {
            // MODO EDIÇÃO
            result = await updateSystemUser(editingId, {
                email: newEmail,
                password: newPassword,
                fullName: newName,
                role: roleToSave // <--- Enviando a role atualizada
            })
        } else {
            // MODO CRIAÇÃO
            result = await createSystemUser({
                email: newEmail,
                password: newPassword,
                fullName: newName,
                role: roleToSave // <--- Enviando a role na criação
            })
        }

        if (result.success) {
            toast.success(editingId ? 'Usuário atualizado!' : 'Usuário criado!')
            setIsDialogOpen(false)
            loadUsers()
        } else {
            toast.error('Erro ao salvar', { description: result.message })
        }
        setSaving(false)
    }

    // Deletar Usuário
    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este acesso permanentemente?')) return

        const result = await deleteSystemUser(id)
        if (result.success) {
            toast.success('Usuário removido')
            loadUsers()
        } else {
            toast.error('Erro', { description: result.message })
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Controle de Acessos</h1>
                    <p className="text-muted-foreground">Gerencie quem pode acessar o sistema.</p>
                </div>

                <Button onClick={handleOpenCreate} className="bg-neutral-900">
                    <UserPlus className="w-4 h-4 mr-2" /> Novo Usuário
                </Button>

                {/* MODAL DE CADASTRO/EDIÇÃO */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Usuário' : 'Adicionar Usuário'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome Completo</Label>
                                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ex: João da Silva" />
                            </div>
                            <div className="space-y-2">
                                <Label>E-mail de Acesso</Label>
                                <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="joao@empresa.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>
                                    {editingId ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                                </Label>
                                <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder={editingId ? "Deixe em branco para não alterar" : "******"}
                                />
                                {editingId && <p className="text-[10px] text-muted-foreground">Preencha apenas se quiser trocar a senha.</p>}
                            </div>

                            {/* --- SWITCH DE ADMIN --- */}
                            <div className="flex items-center justify-between rounded-lg border p-4 bg-neutral-50">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-semibold">Acesso Administrativo</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Pode gerenciar outros usuários?
                                    </p>
                                </div>
                                <Switch
                                    checked={isAdmin}
                                    onCheckedChange={setIsAdmin}
                                />
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
                                {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar Dados</>}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" /> Usuários Ativos
                    </CardTitle>
                    <CardDescription>Lista de logins permitidos no sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>E-mail</TableHead>
                                    <TableHead>Permissão</TableHead> {/* Nova Coluna */}
                                    <TableHead>Criado em</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">Carregando...</TableCell></TableRow>
                                ) : users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell className="font-medium">
                                            {u.user_metadata?.full_name || 'Sem nome'}
                                        </TableCell>
                                        <TableCell>{u.email}</TableCell>

                                        {/* Coluna de Permissão Visual */}
                                        <TableCell>
                                            {u.user_metadata?.role === 'admin' ? (
                                                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200 border-0 flex w-fit gap-1 items-center">
                                                    <ShieldAlert className="w-3 h-3" /> Admin
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-neutral-600 flex w-fit gap-1 items-center">
                                                    <User className="w-3 h-3" /> Usuário
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-muted-foreground text-sm">
                                            {format(new Date(u.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="hover:bg-blue-50 hover:text-blue-600"
                                                    onClick={() => handleOpenEdit(u)}
                                                    title="Editar Dados"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDelete(u.id)}
                                                    title="Excluir Acesso"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}