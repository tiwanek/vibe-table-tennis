import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getRatingTier, getTierColor, getTierBgColor, type RatingTier } from '@/lib/mmr'
import { Trophy, Medal } from 'lucide-react'

export function Leaderboard() {
  const { user } = useAuthStore()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: usersApi.getAll,
  })

  // Users are already sorted by MMR descending from the API
  const currentUserRank = users.findIndex((u) => u.id === user?.id) + 1
  const currentUserData = users.find((u) => u.id === user?.id)

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-yellow-500" />
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>

      {/* Current user's rank summary */}
      {currentUserData && currentUserRank > 0 && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Ranking</CardTitle>
            <CardDescription>Your current position on the leaderboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">#{currentUserRank}</div>
                <div>
                  <div className="font-medium">{currentUserData.username}</div>
                  <div className="text-sm text-muted-foreground">{currentUserData.mmr} MMR</div>
                </div>
              </div>
              <TierBadge tier={getRatingTier(currentUserData.mmr)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="h-5 w-5" />
            All Players
          </CardTitle>
          <CardDescription>{users.length} players ranked by MMR</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No players yet</div>
          ) : (
            <div className="space-y-1">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-1">#</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-3 text-right">MMR</div>
                <div className="col-span-3 text-right">Tier</div>
              </div>

              {/* Table rows */}
              {users.map((leaderboardUser, index) => {
                const rank = index + 1
                const tier = getRatingTier(leaderboardUser.mmr)
                const isCurrentUser = leaderboardUser.id === user?.id

                return (
                  <div
                    key={leaderboardUser.id}
                    className={`grid grid-cols-12 gap-2 px-3 py-3 rounded-md items-center ${
                      isCurrentUser ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                    }`}
                    data-testid={isCurrentUser ? 'current-user-row' : undefined}
                  >
                    <div className="col-span-1">
                      <RankDisplay rank={rank} />
                    </div>
                    <div className="col-span-5 font-medium">
                      {leaderboardUser.username}
                      {isCurrentUser && <span className="ml-2 text-xs text-primary">(You)</span>}
                    </div>
                    <div className="col-span-3 text-right font-mono">{leaderboardUser.mmr}</div>
                    <div className="col-span-3 text-right">
                      <TierBadge tier={tier} size="sm" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className="text-yellow-500 font-bold">{rank}</span>
  }
  if (rank === 2) {
    return <span className="text-gray-400 font-bold">{rank}</span>
  }
  if (rank === 3) {
    return <span className="text-amber-600 font-bold">{rank}</span>
  }
  return <span className="text-muted-foreground">{rank}</span>
}

function TierBadge({ tier, size = 'md' }: { tier: RatingTier; size?: 'sm' | 'md' }) {
  const textColor = getTierColor(tier)
  const bgColor = getTierBgColor(tier)

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${textColor} ${bgColor} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {tier}
    </span>
  )
}
