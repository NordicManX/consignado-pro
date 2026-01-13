'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, User, Trash2, Pencil, Save, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'

export default function ResellersPage() {
    const [resellers, setResellers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Novo Estado para controle de permissão
    const [isAdmin, setIsAdmin] = useState(false)

    // Controle do Modal e Edição
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Estado do Formulário
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        default_commission_percent: 30
    })

    // 0. Verificar se é Admin ao carregar a página
    useEffect(() => {
        async function checkRole() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.user_metadata?.role === 'admin') {
                setIsAdmin(true)
            }
        }
        checkRole()
    }, [])

    // 1. Carregar Revendedoras (Com filtro de Soft Delete)
    async function fetchResellers() {
        setLoading(true)
        const { data, error } = await supabase
            .from('resellers')
            .select('*')
            .is('deleted_at', null) // <--- IMPORTANTE: Só traz quem não foi excluído
            .ilike('name', `%${searchTerm}%`)
            .order('name')

        if (error) {
            toast.error('Erro ao carregar lista')
        } else {
            setResellers(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchResellers()
    }, [searchTerm])

    // 2. Abrir Modal para CRIAR
    const handleOpenNew = () => {
        setEditingId(null)
        setFormData({ name: '', email: '', phone: '', cpf: '', default_commission_percent: 30 })
        setIsDialogOpen(true)
    }

    // 3. Abrir Modal para EDITAR
    const handleOpenEdit = (reseller: any) => {
        setEditingId(reseller.id)
        setFormData({
            name: reseller.name,
            email: reseller.email || '',
            phone: reseller.phone || '',
            cpf: reseller.cpf || '',
            default_commission_percent: reseller.default_commission_percent || 30
        })
        setIsDialogOpen(true)
    }

    // 4. Salvar (Cria ou Atualiza)
    const handleSave = async () => {
        if (!formData.name) return toast.error('Nome é obrigatório')

        setSaving(true)

        try {
            if (editingId) {
                // --- UPDATE ---
                const { error } = await supabase
                    .from('resellers')
                    .update(formData)
                    .eq('id', editingId)

                if (error) throw error
                toast.success('Cadastro atualizado!')

            } else {
                // --- CREATE ---
                const { error } = await supabase
                    .from('resellers')
                    .insert([formData])

                if (error) throw error
                toast.success('Revendedora cadastrada!')
            }

            setIsDialogOpen(false)
            fetchResellers()

        } catch (error: any) {
            toast.error('Erro ao salvar', { description: error.message })
        } finally {
            setSaving(false)
        }
    }

    // 5. Deletar (Soft Delete - Exclusão Lógica)
    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza? A revendedora ficará inativa.')) return

        // Agora fazemos um UPDATE no campo deleted_at ao invés de DELETE
        const { error } = await supabase
            .from('resellers')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id)

        if (error) toast.error('Erro ao excluir')
        else {
            toast.success('Revendedora inativada com sucesso')
            fetchResellers()
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Revendedoras</h1>
                    <p className="text-muted-foreground">Gerencie sua equipe de vendas.</p>
                </div>

                {/* Botão visível apenas para Admin */}
                {isAdmin && (
                    <Button onClick={handleOpenNew} className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" /> Nova Revendedora
                    </Button>
                )}

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingId ? 'Editar Revendedora' : 'Nova Revendedora'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label>Nome Completo</Label>
                                <Input
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>E-mail (Login)</Label>
                                    <Input
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Telefone / Whats</Label>
                                    <Input
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>CPF</Label>
                                    <Input
                                        value={formData.cpf}
                                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Comissão Padrão (%)</Label>
                                    <Input
                                        type="number"
                                        value={formData.default_commission_percent}
                                        onChange={e => setFormData({ ...formData, default_commission_percent: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 mt-4">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar Dados</>}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Contato</TableHead>
                                    <TableHead className="text-center">Comissão</TableHead>
                                    {/* Ações só aparecem para Admin */}
                                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center h-24">Carregando...</TableCell></TableRow>
                                ) : resellers.length === 0 ? (
                                    <TableRow><TableCell colSpan={isAdmin ? 4 : 3} className="text-center h-24 text-muted-foreground">Nenhuma revendedora encontrada.</TableCell></TableRow>
                                ) : (
                                    resellers.map((reseller) => (
                                        <TableRow key={reseller.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">
                                                        <User className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        {reseller.name}
                                                        <p className="text-xs text-muted-foreground">{reseller.email}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-neutral-600">
                                                    {reseller.phone || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">
                                                    {reseller.default_commission_percent}%
                                                </span>
                                            </TableCell>

                                            {/* Botões de Ação Protegidos */}
                                            {isAdmin && (
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleOpenEdit(reseller)}
                                                            className="hover:bg-blue-50 hover:text-blue-600"
                                                            title="Editar"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDelete(reseller.id)}
                                                            className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                                            title="Inativar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}