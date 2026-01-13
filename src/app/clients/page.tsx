'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, User, MapPin, Phone, Trash2 } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // Form
    const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', cpf: '' })

    // 1. Carregar Clientes (O RLS do Supabase filtra automaticamente por usuário)
    async function fetchClients() {
        setLoading(true)
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .ilike('name', `%${searchTerm}%`)
            .order('name')

        if (error) toast.error('Erro ao carregar clientes')
        else setClients(data || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchClients()
    }, [searchTerm])

    // 2. Salvar Cliente
    const handleSave = async () => {
        if (!formData.name) return toast.error('Nome é obrigatório')

        setSaving(true)
        // O user_id é inserido automaticamente pelo Supabase (default auth.uid())
        const { error } = await supabase.from('clients').insert([formData])

        if (error) {
            toast.error('Erro ao salvar')
        } else {
            toast.success('Cliente cadastrado!')
            setIsDialogOpen(false)
            setFormData({ name: '', phone: '', email: '', address: '', cpf: '' }) // Limpa
            fetchClients() // Recarrega
        }
        setSaving(false)
    }

    // 3. Deletar
    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este cliente?')) return
        const { error } = await supabase.from('clients').delete().eq('id', id)
        if (error) toast.error('Erro ao excluir')
        else {
            toast.success('Cliente removido')
            fetchClients()
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Carteira de Clientes</h1>
                    <p className="text-muted-foreground">Gerencie seus consumidores finais.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-neutral-900"><Plus className="w-4 h-4 mr-2" /> Novo Cliente</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Cadastrar Cliente</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label>Nome Completo</Label>
                                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Telefone / WhatsApp</Label>
                                    <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="(00) 00000-0000" />
                                </div>
                                <div className="grid gap-2">
                                    <Label>CPF (Opcional)</Label>
                                    <Input value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>Endereço</Label>
                                <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <Button onClick={handleSave} disabled={saving} className="w-full bg-green-600 hover:bg-green-700">
                                {saving ? 'Salvando...' : 'Salvar Cadastro'}
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
                                    <TableHead>Local</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24">Carregando...</TableCell></TableRow>
                                ) : clients.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Nenhum cliente na sua carteira.</TableCell></TableRow>
                                ) : (
                                    clients.map((client) => (
                                        <TableRow key={client.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 font-bold">
                                                        {client.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        {client.name}
                                                        <p className="text-xs text-muted-foreground font-mono">{client.cpf}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-neutral-600">
                                                    <Phone className="w-3 h-3" /> {client.phone || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-neutral-600">
                                                    <MapPin className="w-3 h-3" /> {client.address || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)} className="text-red-500 hover:bg-red-50">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
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