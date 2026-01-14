'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    TrendingUp,
    ShoppingBag,
    ArrowRight,
    DollarSign,
    Users
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { toast } from "sonner"

import { supabase } from '@/src/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button' // <--- Corrigido (estava @//)
import { WelcomeBanner } from '@/src/components/welcome-banner'

export default function DashboardPage() {
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState({
        moneyOnStreet: 0,
        itemsOnStreet: 0,
        activeBags: 0,
        resellersCount: 0
    })
    const [chartData, setChartData] = useState<any[]>([])
    const [recentActivity, setRecentActivity] = useState<any[]>([])

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                // 1. Buscando Sacolas ABERTAS
                const { data: openConsignments } = await supabase
                    .from('consignments')
                    .select(`
                        total_value, 
                        total_items, 
                        resellers (name)
                    `)
                    .eq('status', 'open')

                // 2. Buscando Total de Revendedoras
                const { count: resellersCount } = await supabase
                    .from('resellers')
                    .select('*', { count: 'exact', head: true })

                // 3. Buscando Histórico Recente
                const { data: recent } = await supabase
                    .from('consignments')
                    .select(`*, resellers(name)`)
                    .eq('status', 'closed')
                    .order('closed_at', { ascending: false })
                    .limit(4)

                if (openConsignments) {
                    const money = openConsignments.reduce((acc, curr) => acc + curr.total_value, 0)
                    const items = openConsignments.reduce((acc, curr) => acc + curr.total_items, 0)

                    setMetrics({
                        moneyOnStreet: money,
                        itemsOnStreet: items,
                        activeBags: openConsignments.length,
                        resellersCount: resellersCount || 0
                    })

                    const chartDataRaw = openConsignments.map((c: any) => ({
                        name: c.resellers.name.split(' ')[0],
                        value: c.total_value
                    }))

                    setChartData(chartDataRaw.sort((a, b) => b.value - a.value).slice(0, 5))
                }

                setRecentActivity(recent || [])

            } catch (error) {
                console.error(error)
                toast.error('Erro ao carregar dashboard')
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

    if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando indicadores...</div>

    return (
        <div className="container mx-auto py-8 max-w-6xl space-y-8">
            <WelcomeBanner />

            <div className="flex justify-end">
                <Link href="/consignments/new">
                    <Button className="bg-green-600 hover:bg-green-700 shadow-md">
                        <ShoppingBag className="w-4 h-4 mr-2" /> Nova Sacola
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dinheiro na Rua</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">R$ {metrics.moneyOnStreet.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Valor total em aberto</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sacolas Ativas</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.activeBags}</div>
                        <p className="text-xs text-muted-foreground">{metrics.itemsOnStreet} peças em circulação</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Revendedoras</CardTitle>
                        <Users className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.resellersCount}</div>
                        <p className="text-xs text-muted-foreground">Cadastradas na base</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento Recente</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Disponível no próximo update</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Top Sacolas Abertas (Valor)</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                        />
                                        <YAxis
                                            stroke="#888888"
                                            fontSize={12}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(value) => `R$${value}`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? '#16a34a' : '#0f172a'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-muted-foreground">
                                    Nenhuma sacola aberta no momento.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Últimos Acertos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {recentActivity.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Nenhum acerto recente.</p>
                            ) : (
                                recentActivity.map((item, i) => (
                                    <div key={i} className="flex items-center">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                                            <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">{item.resellers?.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(item.closed_at).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <div className="ml-auto font-medium text-green-700">
                                            +R$ {(item.total_value * 0.7).toFixed(0)}*
                                        </div>
                                    </div>
                                ))
                            )}

                            <div className="pt-4">
                                <Link href="/consignments">
                                    <Button variant="outline" className="w-full">
                                        Ver Histórico Completo <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function CheckCircleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}