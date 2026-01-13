import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PlayerStanding } from '@/lib/tournament'

interface StandingsTableProps {
  standings: PlayerStanding[]
  title: string
  highlightTop?: number
}

export function StandingsTable({ standings, title, highlightTop = 0 }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-muted-foreground">No standings available</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium text-muted-foreground border-b">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-2 text-center">MP</div>
            <div className="col-span-1 text-center">W</div>
            <div className="col-span-1 text-center">D</div>
            <div className="col-span-2 text-center">L</div>
          </div>

          {/* Table rows */}
          {standings.map((standing) => {
            const isHighlighted = highlightTop > 0 && standing.rank <= highlightTop

            return (
              <div
                key={standing.playerId}
                className={`grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center ${
                  isHighlighted
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900'
                    : 'hover:bg-muted/50'
                }`}
                data-testid="standings-row"
              >
                <div className="col-span-1 text-center">
                  <RankDisplay rank={standing.rank} />
                </div>
                <div className="col-span-5 font-medium truncate">{standing.username}</div>
                <div className="col-span-2 text-center text-muted-foreground">
                  {standing.matchesPlayed}
                </div>
                <div className="col-span-1 text-center font-medium text-green-600 dark:text-green-400">
                  {standing.wins}
                </div>
                <div className="col-span-1 text-center text-muted-foreground">{standing.draws}</div>
                <div className="col-span-2 text-center font-medium text-red-600 dark:text-red-400">
                  {standing.losses}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend for highlighted rows */}
        {highlightTop > 0 && (
          <div className="mt-4 pt-3 border-t text-sm text-muted-foreground">
            <span className="inline-block w-3 h-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded mr-2" />
            Advances to elimination
          </div>
        )}
      </CardContent>
    </Card>
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
