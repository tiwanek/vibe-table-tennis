import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trophy, Swords, TrendingUp } from 'lucide-react'

export function Home() {
  const { user } = useAuthStore()

  const getRatingTier = (mmr: number): string => {
    if (mmr >= 2000) return 'Grandmaster'
    if (mmr >= 1800) return 'Master'
    if (mmr >= 1600) return 'Diamond'
    if (mmr >= 1400) return 'Platinum'
    if (mmr >= 1200) return 'Gold'
    if (mmr >= 1000) return 'Silver'
    if (mmr >= 800) return 'Bronze'
    return 'Iron'
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome, {user?.username}!</h1>
        <p className="text-muted-foreground">Track your matches and compete in tournaments</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>Your Rating</CardTitle>
            <CardDescription>Current MMR and tier</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold">{user?.mmr}</div>
            <div className="text-muted-foreground">{getRatingTier(user?.mmr || 1000)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Swords className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>Matches</CardTitle>
            <CardDescription>Record and confirm matches</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link to="/matches">View Matches</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Trophy className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>Tournaments</CardTitle>
            <CardDescription>Join and compete</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full">
              <Link to="/tournaments">View Tournaments</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
