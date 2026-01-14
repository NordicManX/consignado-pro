'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Trash2, MapPin, Phone, Pencil, User, Loader2 } from 'lucide-react'
import { toast } from "sonner"

import { supabase } from '@/src/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

// --- SCHEMA DE VALIDAÇÃO (COMPLETO) ---
const createClientSchema = z.object({
    name: z.string().min(3, "Nome obrigatório"),
    phone: z.string().min(1, "Telefone obrigatório"),
    cpf: z.string().optional(),
    // Campos detalhados de endereço
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_neighborhood: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().max(2).optional(),
})

type CreateClientFormValues = z.infer<typeof createClientSchema>

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')

    const form = useForm<CreateClientFormValues>({
        resolver: zodResolver(createClientSchema),
        defaultValues: {
            name: '',
            phone: '',
            cpf: '',
            address_street: '',
            address_number: '',
            address_neighborhood: '',
            address_city: '',
            address_state: ''
        }
    })

    // 1. BUSCAR CLIENTES
    async function fetchClients() {
        setLoading(true)
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name')

        if (error) {
            toast.error('Erro ao buscar clientes')
        } else {
            setClients(data || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchClients()
    }, [])

    // 2. CRIAR NOVO CLIENTE
    async function handleCreateClient(data: CreateClientFormValues) {
        setIsCreating(true)
        try {
            const { error } = await supabase
                .from('clients')
                .insert({
                    name: data.name,
                    phone: data.phone,
                    cpf: data.cpf,
                    // Salvando endereço detalhado
                    address_street: data.address_street,
                    address_number: data.address_number,
                    address_neighborhood: data.address_neighborhood,
                    address_city: data.address_city,
                    address_state: data.address_state ? data.address_state.toUpperCase() : null,
                })

            if (error) throw error

            toast.success('Cliente cadastrado com sucesso!')
            setIsDialogOpen(false)
            form.reset()
            fetchClients() // Atualiza a lista

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao criar cliente', { description: error.message })
        } finally {
            setIsCreating(false)
        }
    }

    // 3. DELETAR CLIENTE
    async function handleDelete(id: string) {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return

        const { error } = await supabase.from('clients').delete().eq('id', id)
        if (error) {
            toast.error('Erro ao excluir')
        } else {
            toast.success('Cliente removido')
            fetchClients()
        }
    }

    // Filtro de busca
    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="container mx-auto py-10 max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Carteira de Clientes</h1>
                    <p className="text-muted-foreground">Gerencie seus consumidores finais.</p>
                </div>

                {/* --- MODAL DE NOVO CLIENTE --- */}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className='bg-black text-white hover:bg-neutral-800'>
                            <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Cadastrar Cliente</DialogTitle>
                            <DialogDescription>
                                Preencha os dados completos para facilitar a entrega.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={form.handleSubmit(handleCreateClient)} className="space-y-4 py-2">

                            {/* DADOS PESSOAIS */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <User className="w-4 h-4" /> Dados Pessoais
                                </h4>
                                <div>
                                    <Label>Nome Completo</Label>
                                    <Input {...form.register('name')} placeholder="Ex: Maria da Silva" />
                                    {form.formState.errors.name && <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Telefone / WhatsApp</Label>
                                        <Input {...form.register('phone')} placeholder="(00) 00000-0000" />
                                        {form.formState.errors.phone && <p className="text-red-500 text-xs mt-1">{form.formState.errors.phone.message}</p>}
                                    </div>
                                    <div>
                                        <Label>CPF (Opcional)</Label>
                                        <Input {...form.register('cpf')} placeholder="000.000.000-00" />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* ENDEREÇO DETALHADO */}
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> Endereço
                                </h4>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="col-span-3">
                                        <Label>Rua / Logradouro</Label>
                                        <Input {...form.register('address_street')} placeholder="Rua das Flores" />
                                    </div>
                                    <div className="col-span-1">
                                        <Label>Número</Label>
                                        <Input {...form.register('address_number')} placeholder="123" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Bairro</Label>
                                        <Input {...form.register('address_neighborhood')} placeholder="Centro" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-2">
                                            <Label>Cidade</Label>
                                            <Input {...form.register('address_city')} placeholder="Curitiba" />
                                        </div>
                                        <div>
                                            <Label>UF</Label>
                                            <Input {...form.register('address_state')} maxLength={2} className="uppercase" placeholder="PR" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="mt-6">
                                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isCreating}>
                                    {isCreating ? <Loader2 className="animate-spin w-4 h-4" /> : 'Salvar Cadastro'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
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
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">Carregando...</TableCell>
                                </TableRow>
                            ) : filteredClients.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                                        Nenhum cliente encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredClients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600">
                                                    {client.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p>{client.name}</p>
                                                    {client.cpf && <p className="text-xs text-muted-foreground">{client.cpf}</p>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="w-3 h-3" /> {client.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground max-w-[300px] truncate">
                                                <MapPin className="w-3 h-3 shrink-0" />
                                                {client.address_street ? (
                                                    <span>
                                                        {client.address_street}
                                                        {client.address_number ? `, ${client.address_number}` : ''}
                                                        {client.address_neighborhood ? ` - ${client.address_neighborhood}` : ''}
                                                        {client.address_city ? ` - ${client.address_city}` : ''}
                                                        {client.address_state ? ` / ${client.address_state}` : ''}
                                                    </span>
                                                ) : (
                                                    <span className="italic text-xs">Sem endereço</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* Botão Editar */}
                                                <Link href={`/clients/${client.id}`}>
                                                    <Button variant="ghost" size="icon" title="Editar">
                                                        <Pencil className="w-4 h-4 text-blue-600" />
                                                    </Button>
                                                </Link>
                                                {/* Botão Excluir */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(client.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}