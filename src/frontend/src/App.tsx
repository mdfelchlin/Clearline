import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { YearProvider } from './context/YearContext'
import { MainLayout } from './components/layout/MainLayout'
import Login from './pages/auth/Login'
import GoogleCallback from './pages/auth/GoogleCallback'
import Budget from './pages/budget/Budget'
import IncomePage from './pages/budget/Income'
import TaxDashboard from './pages/tax/TaxDashboard'
import Settings from './pages/settings/Settings'
import { LoadingPage } from './components/ui/Spinner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingPage />

  if (!user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?return=${returnUrl}`} replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingPage />

  if (user && (location.pathname === '/login' || location.pathname === '/auth/callback')) {
    const returnUrl = new URLSearchParams(location.search).get('return') ?? '/'
    return <Navigate to={returnUrl} replace />
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<GoogleCallback />} />
      <Route
        element={
          <RequireAuth>
            <YearProvider>
              <MainLayout />
            </YearProvider>
          </RequireAuth>
        }
      >
        <Route index element={<Budget />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="tax" element={<TaxDashboard />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
