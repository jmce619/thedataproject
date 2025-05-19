// app/api/sports/games/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic' // 👈 fix added here

// List of Eastern Conference team abbreviations
const EAST_TEAMS = ['BOS', 'BRK', 'NYK', 'PHI', 'TOR', 'CHI', 'CLE', 'DET', 'IND', 'MIL']

export async function GET(_: NextRequest) {
  const res = await fetch(
    'https://www.balldontlie.io/api/v1/games?seasons[]=2024&per_page=100'
  )
  const json = await res.json()

  const games = json.data.map((g: any) => ({
    home_team: g.home_team.abbreviation,
    away_team: g.away_team.abbreviation,
    home_team_score: g.home_team_score,
    away_team_score: g.away_team_score,
    gameStatusText: g.status,
  }))

  const east = games.filter(
    (g: any) => EAST_TEAMS.includes(g.home_team) || EAST_TEAMS.includes(g.away_team)
  )
  const west = games.filter(
    (g: any) => !EAST_TEAMS.includes(g.home_team) && !EAST_TEAMS.includes(g.away_team)
  )

  return NextResponse.json({ east, west })
}
