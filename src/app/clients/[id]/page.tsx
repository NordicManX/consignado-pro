'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Loader2, User, MapPin, Phone as PhoneIcon } from 'lucide-react'
import { toast } from "sonner"

import { supabase } from '@/src/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

// Schema de Validação (Igual ao de criação)
const clientSchema = z.object({
    name: z.string().min(3, "Nome completo é obrigatório"),
    cpf: z.string().optional(),
    phone: z.string().min(1, "Telefone é obrigatório"),
    address_street: z.string().optional(),
    address_number: z.string().optional(),
    address_neighborhood: z.string().optional(),
    address_city: z.string().optional(),
    address_state: z.string().max(2).optional(),
})

type ClientFormValues = z.infer<typeof clientSchema>

export default function EditClientPage() {
    const router = useRouter()
    const params = useParams()
    const clientId = params.id as string

    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)

    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            name: '',
            cpf: '',
            phone: '',
            address_street: '',
            address_number: '',
            address_neighborhood: '',
            address_city: '',
            address_state: ''
        }
    })

    // 1. CARREGAR DADOS DO CLIENTE
    useEffect(() => {
        async function loadClient() {
            if (!clientId) return

            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('id', clientId)
                .single()

            if (error) {
                toast.error('Erro ao carregar cliente')
                router.push('/clients')
                return
            }

            // Preenche o formulário
            form.reset({
                name: data.name,
                cpf: data.cpf || '',
                phone: data.phone || '',
                address_street: data.address_street || '',
                address_number: data.address_number || '',
                address_neighborhood: data.address_neighborhood || '',
                address_city: data.address_city || '',
                address_state: data.address_state || ''
            })
            setIsFetching(false)
        }
        loadClient()
    }, [clientId, router, form])

    // 2. SALVAR ALTERAÇÕES
    async function onSubmit(data: ClientFormValues) {
        setIsLoading(true)
        try {
            const { error } = await supabase
                .from('clients')
                .update({
                    name: data.name,
                    cpf: data.cpf,
                    phone: data.phone,
                    address_street: data.address_street,
                    address_number: data.address_number,
                    address_neighborhood: data.address_neighborhood,
                    address_city: data.address_city,
                    address_state: data.address_state,
                })
                .eq('id', clientId)

            if (error) throw error

            toast.success('Cliente atualizado com sucesso!')
            router.push('/clients')

        } catch (error: any) {
            console.error(error)
            toast.error('Erro ao atualizar', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    if (isFetching) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin w-8 h-8 text-green-600" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 max-w-3xl">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mr-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <h1 className="text-3xl font-bold text-neutral-900">Editar Cliente</h1>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* DADOS PESSOAIS */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <User className="w-5 h-5 text-blue-600" /> Dados Pessoais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Nome Completo</Label>
                            <Input {...form.register('name')} />
                            {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>CPF</Label>
                                <Input {...form.register('cpf')} placeholder="000.000.000-00" />
                            </div>
                            <div>
                                <Label>Telefone / WhatsApp</Label>
                                <div className="relative">
                                    <PhoneIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input {...form.register('phone')} className="pl-9" />
                                </div>
                                {form.formState.errors.phone && <p className="text-red-500 text-sm">{form.formState.errors.phone.message}</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ENDEREÇO */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MapPin className="w-5 h-5 text-orange-600" /> Endereço
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <Label>Rua / Logradouro</Label>
                                <Input {...form.register('address_street')} />
                            </div>
                            <div>
                                <Label>Número</Label>
                                <Input {...form.register('address_number')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Bairro</Label>
                                <Input {...form.register('address_neighborhood')} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2">
                                    <Label>Cidade</Label>
                                    <Input {...form.register('address_city')} />
                                </div>
                                <div>
                                    <Label>UF</Label>
                                    <Input {...form.register('address_state')} maxLength={2} className="uppercase" />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={isLoading} className="bg-green-600 hover:bg-green-700 shadow-md">
                        {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
                    </Button>
                </div>
            </form>
        </div>
    )
}