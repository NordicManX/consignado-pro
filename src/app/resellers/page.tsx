'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Users } from 'lucide-react'
import { supabase } from '@/src/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ResellersListPage() {
    const [resellers, setResellers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetch() {
            const { data } = await supabase.from('resellers').select('*').order('name')
            setResellers(data || [])
            setLoading(false)
        }
        fetch()
    }, [])

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Revendedoras</h1>
                    <p className="text-muted-foreground">Gerencie sua equipe de vendas.</p>
                </div>
                <Link href="/resellers/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" /> Nova Revendedora
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por nome..." className="pl-8" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Comissão</TableHead>
                                <TableHead>Limite</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5}>Carregando...</TableCell></TableRow>
                            ) : resellers.map((reseller) => (
                                <TableRow key={reseller.id}>
                                    <TableCell className="font-medium">{reseller.name}</TableCell>
                                    <TableCell>{reseller.phone}</TableCell>
                                    <TableCell>{reseller.default_commission_percent}%</TableCell>
                                    <TableCell>R$ {reseller.credit_limit}</TableCell>
                                    <TableCell className="text-right">
                                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Ativa</span>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && resellers.length === 0 && (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Nenhuma revendedora encontrada.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}