// app/api/sports/players/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Fetch all players (first 100) then their season averages
export async function GET(_: NextRequest) {
  const playersRes = await fetch(
    'https://www.balldontlie.io/api/v1/players?per_page=100'
  )
  const playersJson = await playersRes.json()
  const players = playersJson.data as any[]

  // get season averages for these players
  const ids = players.map((p) => p.id).join('&player_ids[]=')
  const statsRes = await fetch(
    `https://www.balldontlie.io/api/v1/season_averages?season=2024&player_ids[]=${ids}`
  )
  const statsJson = await statsRes.json()
  // merge name + stats
  const merged = statsJson.data.map((s: any) => {
    const p = players.find((x) => x.id === s.player_id)!
    return {
      player_id: p.id,
      player_name: `${p.first_name} ${p.last_name}`,
      pts: s.pts,
      ast: s.ast,
      reb: s.reb,
      stl: s.stl,
      blk: s.blk,
      ppg: s.pts,
      fgp: (s.fg_pct * 100).toFixed(1),
      tpp: (s.fg3_pct * 100).toFixed(1),
    }
  })

  return NextResponse.json(merged)
}
