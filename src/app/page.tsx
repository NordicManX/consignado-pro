import { redirect } from 'next/navigation'

export default function Home() {
    // Redireciona imediatamente para a tela de login
    redirect('/login')
}