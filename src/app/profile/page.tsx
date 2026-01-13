'use client'

import { useEffect, useState } from 'react'
import { User, Mail, Lock, Save, Loader2 } from 'lucide-react'
import { toast } from "sonner"
import { supabase } from '@/src/lib/supabase'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function ProfilePage() {
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)

    // Estados do Formulário
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // Carregar dados do usuário logado
    useEffect(() => {
        async function loadUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Pega o nome do metadata ou do email
                const metaName = user.user_metadata?.full_name || ''
                setFullName(metaName)
                setEmail(user.email || '')
            }
            setLoading(false)
        }
        loadUser()
    }, [])

    // 1. Atualizar Nome (Metadados)
    const handleUpdateName = async () => {
        if (!fullName.trim()) return toast.error('O nome não pode estar vazio.')

        setUpdating(true)
        const { error } = await supabase.auth.updateUser({
            data: { full_name: fullName }
        })

        if (error) toast.error('Erro ao atualizar nome')
        else toast.success('Nome atualizado com sucesso!')

        setUpdating(false)
    }

    // 2. Atualizar Email
    const handleUpdateEmail = async () => {
        if (!email.includes('@')) return toast.error('Email inválido.')

        setUpdating(true)
        const { error } = await supabase.auth.updateUser({ email: email })

        if (error) {
            toast.error('Erro ao atualizar email', { description: error.message })
        } else {
            toast.info('Verifique seu email!', {
                description: 'Enviamos um link de confirmação para o novo endereço.'
            })
        }
        setUpdating(false)
    }

    // 3. Atualizar Senha
    const handleUpdatePassword = async () => {
        if (password.length < 6) return toast.error('A senha deve ter no mínimo 6 caracteres.')

        setUpdating(true)
        const { error } = await supabase.auth.updateUser({ password: password })

        if (error) {
            toast.error('Erro ao mudar senha', { description: error.message })
        } else {
            toast.success('Senha alterada!', { description: 'Use a nova senha no próximo login.' })
            setPassword('') // Limpa o campo
        }
        setUpdating(false)
    }

    if (loading) return <div className="p-10 text-center">Carregando perfil...</div>

    return (
        <div className="container mx-auto py-8 max-w-4xl space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
                <p className="text-muted-foreground">Gerencie suas informações pessoais e credenciais.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">

                {/* Cartão 1: Dados Pessoais */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-green-600" /> Dados Pessoais
                        </CardTitle>
                        <CardDescription>Como você será identificado no sistema.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Seu nome"
                            />
                        </div>
                        <Button
                            onClick={handleUpdateName}
                            disabled={updating}
                            className="w-full bg-neutral-900"
                        >
                            {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Salvar Nome</>}
                        </Button>
                    </CardContent>
                </Card>

                {/* Cartão 2: Segurança */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-600" /> Segurança
                        </CardTitle>
                        <CardDescription>Gerencie seu acesso e senha.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Alterar Email */}
                        <div className="space-y-2">
                            <Label>E-mail de Acesso</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="novo@email.com"
                                />
                                <Button variant="outline" size="icon" onClick={handleUpdateEmail} disabled={updating} title="Atualizar Email">
                                    <Save className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Você precisará confirmar o novo e-mail.</p>
                        </div>

                        <div className="border-t border-neutral-100"></div>

                        {/* Alterar Senha */}
                        <div className="space-y-2">
                            <Label>Nova Senha</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <Button variant="outline" size="icon" onClick={handleUpdatePassword} disabled={updating} title="Atualizar Senha">
                                    <Save className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                    </CardContent>
                </Card>
            </div>
        </div>
    )
}