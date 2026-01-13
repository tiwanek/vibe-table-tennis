import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tournamentsApi, matchesApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, ArrowRight } from 'lucide-react'
import type { Match } from '@/types'

export function TournamentDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data: tournament, isLoading } = useQuery({
    queryKey: ['tournament', id],
    queryFn: () => tournamentsApi.getById(id!),
    enabled: !!id,
  })

  const advanceTournament = useMutation({
    mutationFn: () => tournamentsApi.advance(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] })
    },
  })

  const confirmMatch = useMutation({
    mutationFn: matchesApi.confirm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournament', id] })
    },
  })

  if (isLoading || !tournament) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  const canConfirm = (match: Match) => {
    return (
      match.status === 'AWAITING_CONFIRM' &&
      match.createdById !== user?.id &&
      (match.player1Id === user?.id || match.player2Id === user?.id)
    )
  }

  const groupedMatches = tournament.matches?.reduce(
    (acc, match) => {
      const key = match.tournamentStage || 'OTHER'
      if (!acc[key]) acc[key] = []
      acc[key].push(match)
      return acc
    },
    {} as Record<string, Match[]>
  )

  const isCreator = tournament.creatorId === user?.id
  const allCurrentRoundConfirmed =
    tournament.type === 'SWISS' &&
    tournament.matches
      ?.filter((m) => m.tournamentStage === `SWISS_ROUND_${tournament.currentRound}`)
      .every((m) => m.status === 'CONFIRMED')

  // For GROUP_ELIMINATION: check if all group matches are confirmed and no elimination matches exist yet
  const groupMatches = tournament.matches?.filter((m) => m.tournamentStage === 'GROUP') || []
  const eliminationMatches = tournament.matches?.filter((m) =>
    m.tournamentStage === 'SEMIFINAL' || m.tournamentStage === 'FINAL' || m.tournamentStage === 'QUARTERFINAL'
  ) || []
  const allGroupMatchesConfirmed = groupMatches.length > 0 && groupMatches.every((m) => m.status === 'CONFIRMED')
  const canAdvanceToElimination =
    tournament.type === 'GROUP_ELIMINATION' &&
    tournament.status === 'LIVE' &&
    allGroupMatchesConfirmed &&
    eliminationMatches.length === 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{tournament.name}</h1>
          <p className="text-muted-foreground">
            {tournament.type.replace('_', ' ')} | Status: {tournament.status}
            {tournament.currentRound && ` | Round ${tournament.currentRound}`}
          </p>
        </div>
        {isCreator && tournament.status === 'LIVE' && tournament.type === 'SWISS' && allCurrentRoundConfirmed && (
          <Button onClick={() => advanceTournament.mutate()} disabled={advanceTournament.isPending}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Advance Round
          </Button>
        )}
        {isCreator && canAdvanceToElimination && (
          <Button onClick={() => advanceTournament.mutate()} disabled={advanceTournament.isPending}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Advance to Elimination
          </Button>
        )}
      </div>

      <Tabs defaultValue="matches">
        <TabsList>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="players">Players ({tournament.players.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-6">
          {Object.entries(groupedMatches || {}).map(([stage, matches]) => (
            <Card key={stage}>
              <CardHeader>
                <CardTitle className="text-lg">{stage.replace(/_/g, ' ')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {matches.map((match) => (
                  <div
                    key={match.id}
                    className="flex justify-between items-center p-3 bg-muted rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <span className={match.player1Score !== null && match.player1Score > (match.player2Score || 0) ? 'font-bold' : ''}>
                          {match.player1.username}
                        </span>
                        <span className="text-muted-foreground">
                          {match.player1Score ?? '-'} : {match.player2Score ?? '-'}
                        </span>
                        <span className={match.player2Score !== null && match.player2Score > (match.player1Score || 0) ? 'font-bold' : ''}>
                          {match.player2.username}
                        </span>
                      </div>
                      {match.groupName && (
                        <div className="text-sm text-muted-foreground">Group {match.groupName}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          match.status === 'CONFIRMED'
                            ? 'bg-green-100 text-green-800'
                            : match.status === 'AWAITING_CONFIRM'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {match.status.replace('_', ' ')}
                      </span>
                      {canConfirm(match) && (
                        <Button
                          size="sm"
                          onClick={() => confirmMatch.mutate(match.id)}
                          disabled={confirmMatch.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {(!tournament.matches || tournament.matches.length === 0) && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No matches yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registered Players</CardTitle>
              <CardDescription>Sorted by MMR</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tournament.players
                  .sort((a, b) => b.user.mmr - a.user.mmr)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className="flex justify-between items-center p-2 bg-muted rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-6">{index + 1}.</span>
                        <span>{player.user.username}</span>
                        {player.groupName && (
                          <span className="text-sm text-muted-foreground">
                            (Group {player.groupName})
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground">{player.user.mmr} MMR</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
