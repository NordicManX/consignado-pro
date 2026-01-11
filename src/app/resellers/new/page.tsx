'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, User } from 'lucide-react'
import { toast } from "sonner"

import { supabase } from '@/src/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const resellerSchema = z.object({
    name: z.string().min(3, "Nome obrigatório"),
    cpf: z.string().min(11, "CPF inválido").optional().or(z.literal('')),
    phone: z.string().min(10, "Telefone inválido"),
    address: z.string().optional(),
    default_commission_percent: z.coerce.number().min(0).max(100),
    credit_limit: z.coerce.number().min(0)
})

type ResellerForm = z.infer<typeof resellerSchema>

export default function NewResellerPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<ResellerForm>({
        resolver: zodResolver(resellerSchema),
        defaultValues: {
            default_commission_percent: 30, // Padrão de mercado
            credit_limit: 1000, // Limite inicial seguro
        }
    })

    async function onSubmit(data: ResellerForm) {
        setIsLoading(true)
        try {
            const { error } = await supabase.from('resellers').insert({
                name: data.name,
                cpf: data.cpf || null, // Trata string vazia como null
                phone: data.phone,
                address: data.address,
                default_commission_percent: data.default_commission_percent,
                credit_limit: data.credit_limit
            })

            if (error) throw error

            toast.success('Revendedora cadastrada!')
            router.push('/resellers')
        } catch (error: any) {
            toast.error('Erro ao salvar', { description: error.message })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <div className="flex items-center mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mr-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                </Button>
                <h1 className="text-3xl font-bold">Nova Revendedora</h1>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5" /> Dados Pessoais
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        <div>
                            <Label>Nome Completo</Label>
                            <Input {...form.register('name')} placeholder="Ex: Maria das Graças" />
                            {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>CPF (Apenas números)</Label>
                                <Input {...form.register('cpf')} placeholder="000.000.000-00" />
                            </div>
                            <div>
                                <Label>WhatsApp / Telefone</Label>
                                <Input {...form.register('phone')} placeholder="(00) 90000-0000" />
                                {form.formState.errors.phone && <p className="text-red-500 text-sm">{form.formState.errors.phone.message}</p>}
                            </div>
                        </div>

                        <div>
                            <Label>Endereço Completo</Label>
                            <Input {...form.register('address')} placeholder="Rua, Número, Bairro" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                            <div>
                                <Label>Comissão Padrão (%)</Label>
                                <Input type="number" {...form.register('default_commission_percent')} />
                                <p className="text-xs text-muted-foreground mt-1">Quanto ela ganha por venda.</p>
                            </div>
                            <div>
                                <Label>Limite de Crédito (R$)</Label>
                                <Input type="number" step="0.01" {...form.register('credit_limit')} />
                                <p className="text-xs text-muted-foreground mt-1">Valor máximo em mãos.</p>
                            </div>
                        </div>

                        <Button type="submit" className="w-full mt-6" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar Cadastro</>}
                        </Button>

                    </CardContent>
                </Card>
            </form>
        </div>
    )
}