'use client'

import { useEffect, useState } from 'react'
import { Sun, CloudRain, MapPin, Calendar, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/src/lib/supabase'

export function WelcomeBanner() {
    const [userName, setUserName] = useState<string>('Visitante')
    const [greeting, setGreeting] = useState('')
    const [locationInfo, setLocationInfo] = useState<{ city: string, temp: number } | null>(null)
    const [loadingLoc, setLoadingLoc] = useState(true)

    useEffect(() => {
        // 1. Definir Saudação (Bom dia/Tarde/Noite)
        const hour = new Date().getHours()
        if (hour >= 5 && hour < 12) setGreeting('Bom dia')
        else if (hour >= 12 && hour < 18) setGreeting('Boa tarde')
        else setGreeting('Boa noite')

        // 2. Pegar Nome do Usuário Logado
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user?.email) {
                // Tenta pegar o nome do metadata ou usa a parte antes do @ do email
                const name = user.user_metadata?.full_name || user.email.split('@')[0]
                // Capitaliza a primeira letra
                setUserName(name.charAt(0).toUpperCase() + name.slice(1))
            }
        }
        getUser()

        // 3. Pegar Localização e Clima (APIs Gratuitas)
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                try {
                    const { latitude, longitude } = position.coords

                    // A. Clima (Open-Meteo - Grátis)
                    const weatherRes = await fetch(
                        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
                    )
                    const weatherData = await weatherRes.json()

                    // B. Nome da Cidade (BigDataCloud - Grátis)
                    const cityRes = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
                    )
                    const cityData = await cityRes.json()

                    setLocationInfo({
                        city: cityData.city || cityData.locality || 'Localização desconhecida',
                        temp: weatherData.current_weather.temperature
                    })
                } catch (error) {
                    console.error("Erro ao buscar clima", error)
                } finally {
                    setLoadingLoc(false)
                }
            }, () => {
                setLoadingLoc(false) // Usuário negou permissão
                console.log("Permissão de localização negada")
            })
        } else {
            setLoadingLoc(false)
        }
    }, [])

    // Formata a data de hoje: "Segunda-feira, 12 de Janeiro"
    const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
    const capitalizedDate = today.charAt(0).toUpperCase() + today.slice(1)

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-white p-6 rounded-xl border border-neutral-100 shadow-sm">

            {/* Lado Esquerdo: Saudação */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900">
                    {greeting}, <span className="text-green-600">{userName}</span>.
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm md:text-base">
                    <Calendar className="w-4 h-4" />
                    {capitalizedDate}
                </p>
            </div>

            {/* Lado Direito: Widget de Clima/Local */}
            <div className="mt-4 md:mt-0 flex items-center gap-4 bg-neutral-50 px-4 py-2 rounded-lg border border-neutral-200">
                {loadingLoc ? (
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Loader2 className="w-4 h-4 animate-spin" /> Localizando...
                    </div>
                ) : locationInfo ? (
                    <>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1 font-bold text-neutral-800 text-lg">
                                {locationInfo.temp > 25 ? <Sun className="w-5 h-5 text-orange-500" /> : <CloudRain className="w-5 h-5 text-blue-500" />}
                                {locationInfo.temp}°C
                            </div>
                            <div className="flex items-center gap-1 text-xs text-neutral-500 uppercase tracking-wider font-medium">
                                <MapPin className="w-3 h-3" /> {locationInfo.city}
                            </div>
                        </div>
                    </>
                ) : (
                    <span className="text-xs text-neutral-400">Localização indisponível</span>
                )}
            </div>

        </div>
    )
}