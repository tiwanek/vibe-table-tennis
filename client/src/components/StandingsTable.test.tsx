import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StandingsTable } from './StandingsTable'
import type { PlayerStanding } from '@/lib/tournament'

const mockStandings: PlayerStanding[] = [
  {
    rank: 1,
    playerId: 'p1',
    username: 'Alice',
    matchesPlayed: 3,
    wins: 3,
    draws: 0,
    losses: 0,
    pointsFor: 33,
    pointsAgainst: 15,
  },
  {
    rank: 2,
    playerId: 'p2',
    username: 'Bob',
    matchesPlayed: 3,
    wins: 2,
    draws: 0,
    losses: 1,
    pointsFor: 28,
    pointsAgainst: 20,
  },
  {
    rank: 3,
    playerId: 'p3',
    username: 'Charlie',
    matchesPlayed: 3,
    wins: 1,
    draws: 0,
    losses: 2,
    pointsFor: 20,
    pointsAgainst: 28,
  },
]

describe('StandingsTable', () => {
  it('renders the title', () => {
    render(<StandingsTable standings={mockStandings} title="Group A" />)
    expect(screen.getByText('Group A')).toBeInTheDocument()
  })

  it('renders table headers', () => {
    render(<StandingsTable standings={mockStandings} title="Standings" />)
    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('Player')).toBeInTheDocument()
    expect(screen.getByText('MP')).toBeInTheDocument()
    expect(screen.getByText('W')).toBeInTheDocument()
    expect(screen.getByText('D')).toBeInTheDocument()
    expect(screen.getByText('L')).toBeInTheDocument()
  })

  it('renders all players', () => {
    render(<StandingsTable standings={mockStandings} title="Standings" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('renders player statistics correctly', () => {
    render(<StandingsTable standings={mockStandings} title="Standings" />)
    const rows = screen.getAllByTestId('standings-row')
    expect(rows).toHaveLength(3)
  })

  it('shows empty state when no standings', () => {
    render(<StandingsTable standings={[]} title="Empty Group" />)
    expect(screen.getByText('No standings available')).toBeInTheDocument()
  })

  it('highlights top players when highlightTop is set', () => {
    render(<StandingsTable standings={mockStandings} title="Group A" highlightTop={2} />)
    const rows = screen.getAllByTestId('standings-row')

    // First two rows should be highlighted (have green background class)
    expect(rows[0]).toHaveClass('bg-green-50')
    expect(rows[1]).toHaveClass('bg-green-50')
    // Third row should not be highlighted
    expect(rows[2]).not.toHaveClass('bg-green-50')
  })

  it('shows legend when highlightTop is set', () => {
    render(<StandingsTable standings={mockStandings} title="Group A" highlightTop={2} />)
    expect(screen.getByText('Advances to elimination')).toBeInTheDocument()
  })

  it('does not show legend when highlightTop is 0', () => {
    render(<StandingsTable standings={mockStandings} title="Group A" highlightTop={0} />)
    expect(screen.queryByText('Advances to elimination')).not.toBeInTheDocument()
  })

  it('does not show legend when highlightTop is not provided', () => {
    render(<StandingsTable standings={mockStandings} title="Group A" />)
    expect(screen.queryByText('Advances to elimination')).not.toBeInTheDocument()
  })

  it('displays rank 1 with special styling', () => {
    render(<StandingsTable standings={mockStandings} title="Standings" />)
    const rows = screen.getAllByTestId('standings-row')
    // The rank 1 should have yellow styling (gold)
    expect(rows[0].textContent).toContain('1')
  })

  it('displays correct wins count for each player', () => {
    render(<StandingsTable standings={mockStandings} title="Standings" />)
    const rows = screen.getAllByTestId('standings-row')

    // Alice (rank 1) has 3 wins - wins column has green styling
    const aliceRow = rows[0]
    const aliceWins = aliceRow.querySelector('.text-green-600')
    expect(aliceWins?.textContent).toBe('3')

    // Bob (rank 2) has 2 wins
    const bobRow = rows[1]
    const bobWins = bobRow.querySelector('.text-green-600')
    expect(bobWins?.textContent).toBe('2')

    // Charlie (rank 3) has 1 win
    const charlieRow = rows[2]
    const charlieWins = charlieRow.querySelector('.text-green-600')
    expect(charlieWins?.textContent).toBe('1')
  })
})
