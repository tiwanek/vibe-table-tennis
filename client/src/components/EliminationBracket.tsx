import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getMatchWinner, type EliminationBracket as BracketType } from '@/lib/tournament'
import type { Match } from '@/types'

interface EliminationBracketProps {
  bracket: BracketType
}

export function EliminationBracket({ bracket }: EliminationBracketProps) {
  const { quarterfinals, semifinals, final } = bracket
  const hasQuarterfinals = quarterfinals.length > 0
  const hasSemifinals = semifinals.length > 0
  const hasFinal = final !== null

  if (!hasQuarterfinals && !hasSemifinals && !hasFinal) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Elimination Bracket</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-8 overflow-x-auto pb-4">
          {/* Quarterfinals column */}
          {hasQuarterfinals && <BracketColumn title="Quarterfinals" matches={quarterfinals} />}

          {/* Semifinals column */}
          {hasSemifinals && <BracketColumn title="Semifinals" matches={semifinals} />}

          {/* Final column */}
          {hasFinal && <BracketColumn title="Final" matches={[final]} />}

          {/* Winner column */}
          {hasFinal && final.status === 'CONFIRMED' && (
            <div className="flex flex-col min-w-[140px]">
              <div className="text-sm font-medium text-muted-foreground mb-3">Winner</div>
              <div className="flex-1 flex items-center">
                <WinnerDisplay match={final} />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface BracketColumnProps {
  title: string
  matches: Match[]
}

function BracketColumn({ title, matches }: BracketColumnProps) {
  return (
    <div className="flex flex-col min-w-[180px]">
      <div className="text-sm font-medium text-muted-foreground mb-3">{title}</div>
      <div className="flex flex-col gap-4 justify-around flex-1">
        {matches.map((match) => (
          <BracketMatch key={match.id} match={match} />
        ))}
      </div>
    </div>
  )
}

interface BracketMatchProps {
  match: Match
}

function BracketMatch({ match }: BracketMatchProps) {
  const winner = getMatchWinner(match)
  const isPlayer1Winner = winner?.id === match.player1Id
  const isPlayer2Winner = winner?.id === match.player2Id
  const isCompleted = match.status === 'CONFIRMED'

  return (
    <div className="border rounded-lg overflow-hidden bg-card" data-testid="bracket-match">
      {/* Player 1 */}
      <div
        className={`flex justify-between items-center px-3 py-2 ${
          isPlayer1Winner ? 'bg-green-50 dark:bg-green-950/30' : ''
        }`}
      >
        <span
          className={`truncate ${isPlayer1Winner ? 'font-bold' : ''} ${
            isCompleted && !isPlayer1Winner ? 'text-muted-foreground' : ''
          }`}
        >
          {match.player1?.username || 'TBD'}
        </span>
        <span
          className={`ml-2 font-mono ${isPlayer1Winner ? 'font-bold' : 'text-muted-foreground'}`}
        >
          {match.player1Score ?? '-'}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Player 2 */}
      <div
        className={`flex justify-between items-center px-3 py-2 ${
          isPlayer2Winner ? 'bg-green-50 dark:bg-green-950/30' : ''
        }`}
      >
        <span
          className={`truncate ${isPlayer2Winner ? 'font-bold' : ''} ${
            isCompleted && !isPlayer2Winner ? 'text-muted-foreground' : ''
          }`}
        >
          {match.player2?.username || 'TBD'}
        </span>
        <span
          className={`ml-2 font-mono ${isPlayer2Winner ? 'font-bold' : 'text-muted-foreground'}`}
        >
          {match.player2Score ?? '-'}
        </span>
      </div>
    </div>
  )
}

interface WinnerDisplayProps {
  match: Match
}

function WinnerDisplay({ match }: WinnerDisplayProps) {
  const winner = getMatchWinner(match)

  if (!winner) {
    return <div className="text-muted-foreground">TBD</div>
  }

  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800">
      <span className="text-2xl">🏆</span>
      <span className="font-bold">{winner.username}</span>
    </div>
  )
}
