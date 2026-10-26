import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { Navbar } from './components/ui/Navbar'

// Páginas públicas
import Home from './pages/Home'
const MCs = lazy(() => import('./pages/MCs'))
const MCPerfil = lazy(() => import('./pages/MCPerfil'))
const Ranking = lazy(() => import('./pages/Ranking'))
const Edicoes = lazy(() => import('./pages/Edicoes'))
const EdicaoDetalhe = lazy(() => import('./pages/EdicaoDetalhe'))
const Galeria = lazy(() => import('./pages/Galeria'))
const Sobre = lazy(() => import('./pages/Sobre'))
const Contato = lazy(() => import('./pages/Contato'))
const Calendario = lazy(() => import('./pages/Calendario'))
const EventoDetalhe = lazy(() => import('./pages/EventoDetalhe'))

// Admin
const Login = lazy(() => import('./pages/admin/Login'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminMCs = lazy(() => import('./pages/admin/AdminMCs'))
const AdminEdicoes = lazy(() => import('./pages/admin/AdminEdicoes'))
const AdminBracket = lazy(() => import('./pages/admin/AdminBracket'))
const AdminGaleria = lazy(() => import('./pages/admin/AdminGaleria'))
const AdminPontuacao = lazy(() => import('./pages/admin/AdminPontuacao'))

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
        <Routes>
          {/* Rotas públicas — todas com Navbar */}
          <Route
            path="/"
            element={<><Navbar /><Home /></>}
          />
          <Route path="/sobre" element={<><Navbar /><Sobre /></>} />
          <Route path="/mcs" element={<><Navbar /><MCs /></>} />
          <Route path="/mcs/:id" element={<><Navbar /><MCPerfil /></>} />
          <Route path="/ranking" element={<><Navbar /><Ranking /></>} />
          <Route path="/edicoes" element={<><Navbar /><Edicoes /></>} />
          <Route path="/edicoes/:id" element={<><Navbar /><EdicaoDetalhe /></>} />
          <Route path="/galeria" element={<><Navbar /><Galeria /></>} />
          <Route path="/contato" element={<><Navbar /><Contato /></>} />
          <Route path="/calendario" element={<><Navbar /><Calendario /></>} />
          <Route path="/eventos/:id" element={<><Navbar /><EventoDetalhe /></>} />

          {/* Login admin — sem layout */}
          <Route path="/admin/login" element={<><Navbar /><Login /></>} />

          {/* Admin protegido */}
          <Route path="/admin" element={<><Navbar /><AdminLayout /></>}>
            <Route index element={<Dashboard />} />
            <Route path="mcs" element={<AdminMCs />} />
            <Route path="edicoes" element={<AdminEdicoes />} />
            <Route path="bracket" element={<AdminBracket />} />
            <Route path="pontuacao" element={<AdminPontuacao />} />
            <Route path="galeria" element={<AdminGaleria />} />
          </Route>
        </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}
