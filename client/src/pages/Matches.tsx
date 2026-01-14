import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchesApi, usersApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, Plus, Clock, Edit2 } from 'lucide-react'
import type { Match } from '@/types'

export function Matches() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showNewMatch, setShowNewMatch] = useState(false)
  const [selectedOpponent, setSelectedOpponent] = useState('')
  const [player1Score, setPlayer1Score] = useState('')
  const [player2Score, setPlayer2Score] = useState('')
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [editPlayer1Score, setEditPlayer1Score] = useState('')
  const [editPlayer2Score, setEditPlayer2Score] = useState('')

  const { data: matches = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: matchesApi.getAll,
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  })

  const createMatch = useMutation({
    mutationFn: matchesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setShowNewMatch(false)
      setSelectedOpponent('')
      setPlayer1Score('')
      setPlayer2Score('')
    },
  })

  const confirmMatch = useMutation({
    mutationFn: matchesApi.confirm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
    },
  })

  const updateScore = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { player1Score: number; player2Score: number }
    }) => matchesApi.updateScore(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setEditingMatchId(null)
      setEditPlayer1Score('')
      setEditPlayer2Score('')
    },
    onError: () => {
      // Refresh matches to get latest state
      queryClient.invalidateQueries({ queryKey: ['matches'] })
      setEditingMatchId(null)
      setEditPlayer1Score('')
      setEditPlayer2Score('')
      toast({
        variant: 'destructive',
        title: 'Score submission failed',
        description:
          'Score has already been submitted by another player. The page has been refreshed.',
      })
    },
  })

  const pendingMatches = matches.filter(
    (m) => m.status === 'PENDING' || m.status === 'AWAITING_CONFIRM'
  )
  const confirmedMatches = matches.filter((m) => m.status === 'CONFIRMED')

  const canConfirm = (match: Match) => {
    return (
      match.status === 'AWAITING_CONFIRM' &&
      match.createdById !== user?.id &&
      (match.player1Id === user?.id || match.player2Id === user?.id)
    )
  }

  const canEnterScore = (match: Match) => {
    return (
      match.status === 'PENDING' && (match.player1Id === user?.id || match.player2Id === user?.id)
    )
  }

  const handleStartEditScore = (match: Match) => {
    setEditingMatchId(match.id)
    setEditPlayer1Score('')
    setEditPlayer2Score('')
  }

  const handleSubmitScore = (matchId: string) => {
    if (!editPlayer1Score || !editPlayer2Score) return
    updateScore.mutate({
      id: matchId,
      data: {
        player1Score: parseInt(editPlayer1Score),
        player2Score: parseInt(editPlayer2Score),
      },
    })
  }

  const handleCancelEdit = () => {
    setEditingMatchId(null)
    setEditPlayer1Score('')
    setEditPlayer2Score('')
  }

  const handleCreateMatch = () => {
    if (!selectedOpponent) return

    const data: { player2Id: string; player1Score?: number; player2Score?: number } = {
      player2Id: selectedOpponent,
    }

    if (player1Score && player2Score) {
      data.player1Score = parseInt(player1Score)
      data.player2Score = parseInt(player2Score)
    }

    createMatch.mutate(data)
  }

  const getMatchResult = (match: Match) => {
    if (match.player1Score === null || match.player2Score === null) return null
    const isPlayer1 = match.player1Id === user?.id
    const myScore = isPlayer1 ? match.player1Score : match.player2Score
    const theirScore = isPlayer1 ? match.player2Score : match.player1Score
    return myScore > theirScore ? 'won' : myScore < theirScore ? 'lost' : 'draw'
  }

  if (matchesLoading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Matches</h1>
        <Button onClick={() => setShowNewMatch(!showNewMatch)}>
          <Plus className="h-4 w-4 mr-2" />
          New Match
        </Button>
      </div>

      {showNewMatch && (
        <Card>
          <CardHeader>
            <CardTitle>Record New Match</CardTitle>
            <CardDescription>Select your opponent and optionally enter the score</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Opponent</Label>
              <Select value={selectedOpponent} onValueChange={setSelectedOpponent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select opponent" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.id !== user?.id)
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.username} ({u.mmr} MMR)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Your Score (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={player1Score}
                  onChange={(e) => setPlayer1Score(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Opponent Score (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={player2Score}
                  onChange={(e) => setPlayer2Score(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateMatch}
              disabled={!selectedOpponent || createMatch.isPending}
            >
              {createMatch.isPending ? 'Creating...' : 'Create Match'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({pendingMatches.length})
          </TabsTrigger>
          <TabsTrigger value="confirmed">
            <Check className="h-4 w-4 mr-2" />
            Confirmed ({confirmedMatches.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingMatches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No pending matches
              </CardContent>
            </Card>
          ) : (
            pendingMatches.map((match) => (
              <Card key={match.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {match.player1.username} vs {match.player2.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {match.player1Score !== null && match.player2Score !== null
                          ? `Score: ${match.player1Score} - ${match.player2Score}`
                          : 'Score not entered yet'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Status: {match.status.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {match.tournament ? (
                          <>
                            Tournament: {match.tournament.name}
                            {match.tournamentStage && (
                              <span className="ml-1">
                                ({match.tournamentStage.replace('_', ' ')}
                                {match.groupName && ` - Group ${match.groupName}`})
                              </span>
                            )}
                          </>
                        ) : (
                          'Standalone Match'
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canEnterScore(match) && editingMatchId !== match.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEditScore(match)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Enter Score
                        </Button>
                      )}
                      {canConfirm(match) && (
                        <Button
                          size="sm"
                          onClick={() => confirmMatch.mutate(match.id)}
                          disabled={confirmMatch.isPending}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Confirm
                        </Button>
                      )}
                    </div>
                  </div>
                  {editingMatchId === match.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{match.player1.username}'s Score</Label>
                          <Input
                            type="number"
                            min="0"
                            value={editPlayer1Score}
                            onChange={(e) => setEditPlayer1Score(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{match.player2.username}'s Score</Label>
                          <Input
                            type="number"
                            min="0"
                            value={editPlayer2Score}
                            onChange={(e) => setEditPlayer2Score(e.target.value)}
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSubmitScore(match.id)}
                          disabled={!editPlayer1Score || !editPlayer2Score || updateScore.isPending}
                        >
                          {updateScore.isPending ? 'Submitting...' : 'Submit Score'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="confirmed" className="space-y-4">
          {confirmedMatches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No confirmed matches yet
              </CardContent>
            </Card>
          ) : (
            confirmedMatches.map((match) => {
              const result = getMatchResult(match)
              return (
                <Card key={match.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">
                          {match.player1.username} vs {match.player2.username}
                        </div>
                        <div className="text-sm">
                          Score: {match.player1Score} - {match.player2Score}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {match.tournament ? (
                            <>
                              Tournament: {match.tournament.name}
                              {match.tournamentStage && (
                                <span className="ml-1">
                                  ({match.tournamentStage.replace('_', ' ')}
                                  {match.groupName && ` - Group ${match.groupName}`})
                                </span>
                              )}
                            </>
                          ) : (
                            'Standalone Match'
                          )}
                        </div>
                      </div>
                      <div
                        className={`text-sm font-medium ${
                          result === 'won'
                            ? 'text-green-600'
                            : result === 'lost'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }`}
                      >
                        {result?.toUpperCase()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
