import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { Navbar } from './components/ui/Navbar'

// Páginas públicas
import Home from './pages/Home'
import MCs from './pages/MCs'
import MCPerfil from './pages/MCPerfil'
import Ranking from './pages/Ranking'
import Edicoes from './pages/Edicoes'
import EdicaoDetalhe from './pages/EdicaoDetalhe'
import Galeria from './pages/Galeria'
import Sobre from './pages/Sobre'
import Contato from './pages/Contato'
import Calendario from './pages/Calendario'

// Admin
import Login from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import AdminMCs from './pages/admin/AdminMCs'
import AdminEdicoes from './pages/admin/AdminEdicoes'
import AdminBracket from './pages/admin/AdminBracket'
import AdminGaleria from './pages/admin/AdminGaleria'
import AdminPontuacao from './pages/admin/AdminPontuacao'

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
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
      </ToastProvider>
    </AuthProvider>
  )
}
