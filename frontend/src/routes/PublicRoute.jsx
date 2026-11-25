import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Spinner from '../components/common/Spinner'

export default function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Spinner size="lg" label="Checking your session" /></div>
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}
