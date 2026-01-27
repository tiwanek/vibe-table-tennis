import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EliminationBracket } from './EliminationBracket'
import type { EliminationBracket as BracketType } from '@/lib/tournament'
import type { Match } from '@/types'

const createMockMatch = (overrides: Partial<Match> = {}): Match => ({
  id: 'match-1',
  player1Id: 'p1',
  player2Id: 'p2',
  player1: { id: 'p1', username: 'Alice', mmr: 1000 },
  player2: { id: 'p2', username: 'Bob', mmr: 1000 },
  player1Score: null,
  player2Score: null,
  status: 'PENDING',
  createdById: 'p1',
  confirmedById: null,
  tournamentId: 't1',
  tournamentStage: 'SEMIFINAL',
  groupName: null,
  createdAt: new Date().toISOString(),
  ...overrides,
})

describe('EliminationBracket', () => {
  it('returns null when bracket is empty', () => {
    const emptyBracket: BracketType = {
      quarterfinals: [],
      semifinals: [],
      final: null,
    }

    const { container } = render(<EliminationBracket bracket={emptyBracket} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders bracket title', () => {
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [createMockMatch()],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.getByText('Elimination Bracket')).toBeInTheDocument()
  })

  it('renders semifinals column when semifinals exist', () => {
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [createMockMatch({ id: 'sf1' }), createMockMatch({ id: 'sf2' })],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.getByText('Semifinals')).toBeInTheDocument()
  })

  it('renders quarterfinals column when quarterfinals exist', () => {
    const bracket: BracketType = {
      quarterfinals: [
        createMockMatch({ id: 'qf1', tournamentStage: 'QUARTERFINAL' }),
        createMockMatch({ id: 'qf2', tournamentStage: 'QUARTERFINAL' }),
      ],
      semifinals: [],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.getByText('Quarterfinals')).toBeInTheDocument()
  })

  it('renders final column when final exists', () => {
    const finalMatch = createMockMatch({ id: 'final', tournamentStage: 'FINAL' })
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [],
      final: finalMatch,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.getByText('Final')).toBeInTheDocument()
  })

  it('renders player names', () => {
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [createMockMatch()],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows TBD for missing players', () => {
    const matchWithMissingPlayer = createMockMatch({
      player2: undefined,
    })
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [matchWithMissingPlayer],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.getByText('TBD')).toBeInTheDocument()
  })

  it('displays scores for completed matches', () => {
    const completedMatch = createMockMatch({
      player1Score: 11,
      player2Score: 9,
      status: 'CONFIRMED',
    })
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [completedMatch],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('displays dash for pending match scores', () => {
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [createMockMatch()],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    const dashes = screen.getAllByText('-')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })

  it('renders winner column when final is confirmed', () => {
    const finalMatch = createMockMatch({
      id: 'final',
      tournamentStage: 'FINAL',
      player1Score: 11,
      player2Score: 7,
      status: 'CONFIRMED',
    })
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [],
      final: finalMatch,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.getByText('Winner')).toBeInTheDocument()
    expect(screen.getByText('🏆')).toBeInTheDocument()
  })

  it('does not render winner column when final is not confirmed', () => {
    const finalMatch = createMockMatch({
      id: 'final',
      tournamentStage: 'FINAL',
      status: 'PENDING',
    })
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [],
      final: finalMatch,
    }

    render(<EliminationBracket bracket={bracket} />)
    expect(screen.queryByText('Winner')).not.toBeInTheDocument()
  })

  it('renders bracket matches with data-testid', () => {
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [createMockMatch({ id: 'sf1' }), createMockMatch({ id: 'sf2' })],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    const matches = screen.getAllByTestId('bracket-match')
    expect(matches).toHaveLength(2)
  })

  it('highlights winner in completed match', () => {
    const completedMatch = createMockMatch({
      player1Score: 11,
      player2Score: 5,
      status: 'CONFIRMED',
    })
    const bracket: BracketType = {
      quarterfinals: [],
      semifinals: [completedMatch],
      final: null,
    }

    render(<EliminationBracket bracket={bracket} />)
    // Alice won (player1), her name should be bold
    const aliceElement = screen.getByText('Alice')
    expect(aliceElement).toHaveClass('font-bold')
  })
})
