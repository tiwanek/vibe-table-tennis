import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { LogOut, Trophy, Swords, User } from 'lucide-react'

export function Layout() {
  const { user, logout, isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  if (!isAuthenticated) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold flex items-center gap-2">
            <span>🏓</span>
            <span>Table Tennis</span>
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              to="/matches"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Swords className="h-4 w-4" />
              Matches
            </Link>
            <Link
              to="/tournaments"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Trophy className="h-4 w-4" />
              Tournaments
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span>{user?.username}</span>
              <span className="text-muted-foreground">({user?.mmr} MMR)</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
