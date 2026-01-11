'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Calendar, User, Printer } from 'lucide-react' // Adicionado Printer
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { supabase } from '@/src/lib/supabase' // Caminho corrigido
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function ConsignmentsListPage() {
    const [consignments, setConsignments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetch() {
            // Busca sacolas E o nome da revendedora (join)
            const { data } = await supabase
                .from('consignments')
                .select(`
                  *,
                  resellers (name)
                `)
                .order('created_at', { ascending: false })

            setConsignments(data || [])
            setLoading(false)
        }
        fetch()
    }, [])

    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sacolas</h1>
                    <p className="text-muted-foreground">Controle de saídas e retornos.</p>
                </div>
                <Link href="/consignments/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" /> Nova Sacola
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar por revendedora..." className="pl-8" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table className="min-w-[600px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Data Saída</TableHead>
                                    <TableHead>Revendedora</TableHead>
                                    <TableHead className="text-center">Itens</TableHead>
                                    <TableHead>Valor Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24">Carregando...</TableCell></TableRow>
                                ) : consignments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                                            Nenhuma sacola registrada ainda.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    consignments.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3 text-muted-foreground" />
                                                    {item.resellers?.name || 'Desconhecida'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline">{item.total_items} peças</Badge>
                                            </TableCell>
                                            <TableCell>R$ {item.total_value.toFixed(2)}</TableCell>
                                            <TableCell>
                                                {item.status === 'open' ? (
                                                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0">Em Aberto</Badge>
                                                ) : (
                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">Fechada</Badge>
                                                )}
                                            </TableCell>

                                            {/* Célula de Ações Atualizada com Impressora */}
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">

                                                    {/* Botão de Imprimir Romaneio */}
                                                    <Link href={`/consignments/${item.id}/print`} target="_blank">
                                                        <Button variant="ghost" size="icon" title="Imprimir Romaneio">
                                                            <Printer className="w-4 h-4 text-neutral-600" />
                                                        </Button>
                                                    </Link>

                                                    {/* Botão de Conferir */}
                                                    <Link href={`/consignments/${item.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            Conferir / Acertar
                                                        </Button>
                                                    </Link>
                                                </div>
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