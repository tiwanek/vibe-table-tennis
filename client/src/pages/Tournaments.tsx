import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tournamentsApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
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
import { Plus, Users, Trophy, Play } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Tournament } from '@/types'

export function Tournaments() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showNewTournament, setShowNewTournament] = useState(false)
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState('')
  const [type, setType] = useState<'SWISS' | 'GROUP_ELIMINATION'>('SWISS')

  const { data: tournaments = [], isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentsApi.getAll,
  })

  const createTournament = useMutation({
    mutationFn: tournamentsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      setShowNewTournament(false)
      setName('')
      setNameError('')
      setType('SWISS')
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Failed to create tournament',
        description: 'Please check the tournament name and try again.',
      })
    },
  })

  const registerForTournament = useMutation({
    mutationFn: tournamentsApi.register,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    },
  })

  const unregisterFromTournament = useMutation({
    mutationFn: tournamentsApi.unregister,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    },
  })

  const startTournament = useMutation({
    mutationFn: tournamentsApi.start,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    },
  })

  const openTournaments = tournaments.filter((t) => t.status === 'OPEN')
  const liveTournaments = tournaments.filter((t) => t.status === 'LIVE')
  const finishedTournaments = tournaments.filter((t) => t.status === 'FINISHED')

  const isRegistered = (tournament: Tournament) => {
    return tournament.players.some((p) => p.userId === user?.id)
  }

  const validateName = (value: string): string => {
    const trimmed = value.trim()
    if (trimmed.length === 0) return ''
    if (trimmed.length < 3) return 'Tournament name must be at least 3 characters'
    if (trimmed.length > 100) return 'Tournament name must be at most 100 characters'
    return ''
  }

  const handleNameChange = (value: string) => {
    setName(value)
    setNameError(validateName(value))
  }

  const handleCreateTournament = () => {
    const error = validateName(name)
    if (error) {
      setNameError(error)
      return
    }
    if (!name.trim()) return
    createTournament.mutate({ name: name.trim(), type })
  }

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tournaments</h1>
        <Button onClick={() => setShowNewTournament(!showNewTournament)}>
          <Plus className="h-4 w-4 mr-2" />
          New Tournament
        </Button>
      </div>

      {showNewTournament && (
        <Card>
          <CardHeader>
            <CardTitle>Create Tournament</CardTitle>
            <CardDescription>Set up a new tournament for players to join</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tournament Name</Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Friday Night Tournament"
                className={nameError ? 'border-red-500' : ''}
              />
              {nameError && (
                <p className="text-sm text-red-500">{nameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tournament Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SWISS">Swiss (all players play all rounds)</SelectItem>
                  <SelectItem value="GROUP_ELIMINATION">
                    Group + Elimination (groups then knockout)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleCreateTournament}
              disabled={!name.trim() || !!nameError || createTournament.isPending}
            >
              {createTournament.isPending ? 'Creating...' : 'Create Tournament'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            <Users className="h-4 w-4 mr-2" />
            Open ({openTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="live">
            <Play className="h-4 w-4 mr-2" />
            Live ({liveTournaments.length})
          </TabsTrigger>
          <TabsTrigger value="finished">
            <Trophy className="h-4 w-4 mr-2" />
            Finished ({finishedTournaments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {openTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No open tournaments. Create one to get started!
              </CardContent>
            </Card>
          ) : (
            openTournaments.map((tournament) => (
              <Card key={tournament.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{tournament.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Type: {tournament.type.replace('_', ' ')} | Created by:{' '}
                        {tournament.creator.username}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Players: {tournament.players.length}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isRegistered(tournament) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unregisterFromTournament.mutate(tournament.id)}
                          disabled={unregisterFromTournament.isPending}
                        >
                          Unregister
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => registerForTournament.mutate(tournament.id)}
                          disabled={registerForTournament.isPending}
                        >
                          Register
                        </Button>
                      )}
                      {tournament.creatorId === user?.id && tournament.players.length >= 2 && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startTournament.mutate(tournament.id)}
                          disabled={startTournament.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          {liveTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No live tournaments
              </CardContent>
            </Card>
          ) : (
            liveTournaments.map((tournament) => (
              <Card key={tournament.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{tournament.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Type: {tournament.type.replace('_', ' ')}
                        {tournament.currentRound && ` | Round ${tournament.currentRound}`}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Players: {tournament.players.length}
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <Link to={`/tournaments/${tournament.id}`}>View</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="finished" className="space-y-4">
          {finishedTournaments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No finished tournaments
              </CardContent>
            </Card>
          ) : (
            finishedTournaments.map((tournament) => (
              <Card key={tournament.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{tournament.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Type: {tournament.type.replace('_', ' ')} | Players:{' '}
                        {tournament.players.length}
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/tournaments/${tournament.id}`}>View Results</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
