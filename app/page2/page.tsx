'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { hexbin as makeHexbin } from 'd3-hexbin'
import Image from 'next/image'

/* ===================== Types ===================== */

type ShotData = {
  player_name: string
  x: number
  y: number
  shot_made: number
  shot_attempted: number
}

type PlayerStats = {
  DISPLAY_FIRST_LAST: string
  TEAM_ABBREVIATION: string
  POSITION: string
  HEIGHT: string
  WEIGHT: string
  SEASON: string
  GP: number
  PTS: number
  REB: number
  AST: number
  FG_PCT: number
  FG3_PCT: number
  FT_PCT: number
}

type Game = {
  game_id: string
  date: string
  time: string
  visitor_team: string
  home_team: string
  arena: string
  broadcaster: string
  live_period: number
  live_period_bcast: string
}

type StandingRow = {
  teamId: number
  teamTricode: string
  teamName: string
  win: number
  loss: number
  winPct: number
  gb: string
  confRank: number
}

type StandingsByConf = {
  east: StandingRow[]
  west: StandingRow[]
}

type TeamStat = {
  TEAM_ID: number
  TEAM_NAME: string
  TEAM_ABBREVIATION: string
  GP: number | null
  W: number | null
  L: number | null
  W_PCT: number | null
  MIN: number | null
  PTS: number | null
  REB: number | null
  AST: number | null
  TOV: number | null
  STL: number | null
  BLK: number | null
  FG_PCT: number | null
  FG3_PCT: number | null
  FT_PCT: number | null
  OFF_RATING?: number | null
  DEF_RATING?: number | null
  NET_RATING?: number | null
  PACE?: number | null
  AST_RATIO?: number | null
  OREB_PCT?: number | null
  DREB_PCT?: number | null
  REB_PCT?: number | null
  TM_TOV_PCT?: number | null
  EFG_PCT?: number | null
  TS_PCT?: number | null
  PIE?: number | null
  FTA_RATE?: number | null
  TOV_PCT?: number | null
  E_OFF_RATING?: number | null
  E_DEF_RATING?: number | null
  E_NET_RATING?: number | null
  OPP_EFG_PCT?: number | null
}

type Rankings = {
  [metric: string]: { team_abbr: string; team_name: string; value: number }[]
}

/* ===================== Component ===================== */

export default function SportsPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [allShots, setAllShots] = useState<ShotData[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, PlayerStats>>({})
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([])
  const [standings, setStandings] = useState<StandingsByConf | null>(null)
  const [confTab, setConfTab] = useState<'east' | 'west'>('east')

  // NEW: team stats + rankings
  const [teamStats, setTeamStats] = useState<TeamStat[]>([])
  const [rankings, setRankings] = useState<Rankings>({})
  const [gridMetric, setGridMetric] = useState<'PTS' | 'OFF_RATING' | 'DEF_RATING' | 'NET_RATING' | 'EFG_PCT' | 'TS_PCT'>('PTS')
  const [rankingMetric, setRankingMetric] = useState<string>('OFF_RATING')

  const [player, setPlayer] = useState('')

  /* ----------------- Data loads ----------------- */
  useEffect(() => {
    fetch('/data/all_shot_data.json').then(r => r.json()).then(setAllShots).catch(console.error)
    fetch('/data/player_stats.json').then(r => r.json()).then(setStatsMap).catch(console.error)
    fetch('/data/upcoming_games.json').then(r => r.json()).then(setUpcomingGames).catch(console.error)
    fetch('/data/standings_by_conf.json').then(r => r.json()).then(setStandings).catch(console.error)

    // NEW fetches
    fetch('/data/team_stats.json').then(r => r.json()).then(setTeamStats).catch(console.error)
    fetch('/data/league_rankings.json').then(r => r.json()).then(setRankings).catch(console.error)
  }, [])

  /* ----------------- Players list ----------------- */
  const players = useMemo(() => {
    const shotNames = new Set(allShots.map(s => s.player_name))
    return Object.keys(statsMap).filter(name => shotNames.has(name)).sort()
  }, [allShots, statsMap])

  useEffect(() => {
    if (players.length) setPlayer(players.includes('Stephen Curry') ? 'Stephen Curry' : players[0])
  }, [players])

  /* ----------------- Upcoming games (>= today) ----------------- */
  const visibleGames = useMemo(() => {
    if (!upcomingGames?.length) return []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return upcomingGames
      .filter(g => {
        const d = new Date(g.date)
        d.setHours(0, 0, 0, 0)
        return d >= today
      })
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
  }, [upcomingGames])

  /* ----------------- Shot chart render ----------------- */
  useEffect(() => {
    if (!player) return
    const data = allShots.filter(s => s.player_name === player)
    const totalW = 600, totalH = 560
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }
    const w = totalW - margin.left - margin.right
    const h = totalH - margin.top - margin.bottom
    const svgEl = d3.select(svgRef.current)
    svgEl.selectAll('*').remove()
    const svg = svgEl.attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Court
    svg.append('rect')
      .attr('x', w/2 - 80).attr('y', h - 190)
      .attr('width', 160).attr('height', 190)
      .attr('fill','none').attr('stroke','#555').attr('stroke-width',1.5)
    svg.append('line')
      .attr('x1',0).attr('y1',h).attr('x2',w).attr('y2',h)
      .attr('stroke','#555').attr('stroke-width',1.5)

    // Hexbin
    const hb = makeHexbin<ShotData>().radius(20).x(d => w/2 + d.x).y(d => h - d.y)
    const bins = hb(data)
    const maxCount = d3.max(bins, b => b.length) || 1
    const radiusScale = d3.scaleSqrt().domain([0, maxCount]).range([5, hb.radius()])
    const colorScale = d3.scaleSequential().domain([0,1])
      .interpolator(t => d3.interpolateRgb('#add8e6','#ff0000')(t))

    svg.append('g').selectAll('path').data(bins).enter()
      .append('path')
      .attr('d', d => hb.hexagon(radiusScale(d.length)))
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('fill', d => {
        const att = d.reduce((s,p) => s + p.shot_attempted, 0)
        const made = d.reduce((s,p) => s + p.shot_made, 0)
        return colorScale(att ? made/att : 0)
      })
      .attr('stroke','#333').attr('stroke-width',0.2)
      .on('mouseover',(ev,d) => {
        const att = d.reduce((s,p) => s + p.shot_attempted, 0)
        const made = d.reduce((s,p) => s + p.shot_made, 0)
        const pct = att ? Math.round((made/att)*100) : 0
        const rect = containerRef.current!.getBoundingClientRect()
        d3.select('#tooltip')
          .style('left',`${ev.clientX-rect.left+5}px`)
          .style('top',`${ev.clientY-rect.top+5}px`)
          .style('opacity',1)
          .text(`${made}/${att} made (${pct}% FG)`)
      })
      .on('mouseout',() => d3.select('#tooltip').style('opacity',0))
  }, [player, allShots])

  const stats = statsMap[player]

  /* ----------------- Helpers ----------------- */
  const teamLogoSrc = (abbr: string) => `/images/nba_logos/${abbr}.png`

  const confRows = useMemo(() => {
    if (!standings) return []
    return (confTab === 'east' ? standings.east : standings.west) ?? []
  }, [standings, confTab])

  // Team Stats grid data
  const gridData = useMemo(() => {
    if (!teamStats?.length) return []
    const metric = gridMetric
    const rows = teamStats
      .filter(t => t[metric as keyof TeamStat] !== null && t.TEAM_ABBREVIATION)
      .map(t => ({
        abbr: t.TEAM_ABBREVIATION,
        name: t.TEAM_NAME,
        val: (t[metric as keyof TeamStat] as number) ?? 0
      }))
    const max = Math.max(...rows.map(r => Number(r.val || 0)), 1)
    return rows
      .sort((a, b) => Number(b.val) - Number(a.val))
      .map((r, i) => ({ ...r, rank: i + 1, pct: (Number(r.val) / max) * 100 }))
  }, [teamStats, gridMetric])

  const rankingOptions = useMemo(() => Object.keys(rankings || {}), [rankings])
  const rankingList = useMemo(() => (rankings?.[rankingMetric] || []).slice(0, 10), [rankings, rankingMetric])

  /* ===================== Render ===================== */

  return (
    <div className="sports-dashboard">
      {/* ---------- Sticky Top Upcoming Games Bar ---------- */}
      <section className="upcoming-games-bar">
        <h3>Upcoming Games</h3>
        <div className="games-scroller">
          {visibleGames.length === 0 ? (
            <div className="no-games">No upcoming games found.</div>
          ) : (
            visibleGames.map(g => (
              <div key={g.game_id} className="game-card">
                <time className="game-date">
                  {new Date(g.date).toLocaleDateString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}{' '}
                  <span className="game-time">{g.time}</span>
                </time>
                <div className="game-teams">
                  <div className="team visitor">
                    <Image src={teamLogoSrc(g.visitor_team)} alt={`${g.visitor_team} logo`} width={24} height={24} className="team-logo" />
                    <span>{g.visitor_team}</span>
                  </div>
                  <span className="vs">vs</span>
                  <div className="team home">
                    <Image src={teamLogoSrc(g.home_team)} alt={`${g.home_team} logo`} width={24} height={24} className="team-logo" />
                    <span>{g.home_team}</span>
                  </div>
                </div>
                <div className="game-records">
                  <small>{g.arena}</small>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ---------- Main: Player Sidebar + Shot Chart + Standings ---------- */}
      <div className="content-wrapper">
        <div className="main-content">
          {/* Sidebar */}
          <aside className="player-sidebar">
            {stats ? (
              <>
                <h2>{stats.DISPLAY_FIRST_LAST}</h2>
                <dl className="stats-list">
                  <dt>Team:</dt><dd>{stats.TEAM_ABBREVIATION}</dd>
                  <dt>Pos:</dt><dd>{stats.POSITION}</dd>
                  <dt>Height:</dt><dd>{stats.HEIGHT}</dd>
                  <dt>Weight:</dt><dd>{stats.WEIGHT}</dd>
                  <dt>Season:</dt><dd>{stats.SEASON}</dd>
                  <dt>GP:</dt><dd>{stats.GP}</dd>
                  <dt>PTS:</dt><dd>{stats.PTS}</dd>
                  <dt>REB:</dt><dd>{stats.REB}</dd>
                  <dt>AST:</dt><dd>{stats.AST}</dd>
                  <dt>FG%:</dt><dd>{stats.FG_PCT.toFixed(1)}%</dd>
                  <dt>3P%:</dt><dd>{stats.FG3_PCT.toFixed(1)}%</dd>
                  <dt>FT%:</dt><dd>{stats.FT_PCT.toFixed(1)}%</dd>
                </dl>
              </>
            ) : (
              <p>No stats available.</p>
            )}
          </aside>

          {/* Shot chart */}
          <div className="chart-column chart-column--large">
            <div className="sports-selector">
              <label htmlFor="player-select">Player:</label>
              <select id="player-select" value={player} onChange={e => setPlayer(e.target.value)}>
                {players.map(pn => (<option key={pn} value={pn}>{pn}</option>))}
              </select>
            </div>
            <div ref={containerRef} className="chart-container">
              <svg ref={svgRef} className="shot-chart" />
              <div id="tooltip" className="tooltip"></div>
            </div>
          </div>

          {/* Standings */}
          <aside className="standings-panel">
            <div className="standings-header">
              <h3>Standings</h3>
              <div className="conf-tabs">
                <button className={confTab === 'east' ? 'active' : ''} onClick={() => setConfTab('east')}>East</button>
                <button className={confTab === 'west' ? 'active' : ''} onClick={() => setConfTab('west')}>West</button>
              </div>
            </div>
            <div className="standings-table-wrapper">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>W</th>
                    <th>L</th>
                    <th>Win%</th>
                    <th>GB</th>
                  </tr>
                </thead>
                <tbody>
                  {(confRows || []).map(row => (
                    <tr key={row.teamId}>
                      <td>{row.confRank}</td>
                      <td className="team-cell">
                        <Image
                          src={teamLogoSrc(row.teamTricode)}
                          alt={`${row.teamTricode} logo`}
                          width={20} height={20}
                          className="team-logo"
                        />
                        <span>{row.teamName}</span>
                      </td>
                      <td>{row.win}</td>
                      <td>{row.loss}</td>
                      <td>{(row.winPct * 100).toFixed(1)}%</td>
                      <td>{row.gb}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </aside>
        </div>
      </div>

      {/* ---------- NEW: Team Stats + League Rankings (beneath main) ---------- */}
      <section className="lower-panels">
        {/* Team Stats Grid */}
        <div className="team-stats-card">
          <div className="card-header">
            <h3>Team Stats</h3>
            <div className="metric-select">
              <label>Metric:</label>
              <select value={gridMetric} onChange={e => setGridMetric(e.target.value as any)}>
                <option value="PTS">PTS (per game)</option>
                <option value="OFF_RATING">OffRtg</option>
                <option value="DEF_RATING">DefRtg (lower better)</option>
                <option value="NET_RATING">NetRtg</option>
                <option value="EFG_PCT">eFG%</option>
                <option value="TS_PCT">TS%</option>
              </select>
            </div>
          </div>
          <div className="team-stats-grid">
            {gridData.slice(0, 24).map(row => (
              <div className="team-stat-row" key={row.abbr}>
                <div className="team-id">
                  <span className="rank-badge">{row.rank}</span>
                  <Image
                    src={teamLogoSrc(row.abbr)}
                    alt={`${row.abbr} logo`}
                    width={24}
                    height={24}
                    className="team-logo"
                  />
                  <span className="team-name">{row.abbr}</span>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${row.pct}%` }} />
                </div>
                <div className="value">
                  {typeof row.val === 'number' ? row.val.toFixed(gridMetric.endsWith('_PCT') ? 3 : 1) : row.val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* League Rankings */}
        <div className="league-rankings-card">
          <div className="card-header">
            <h3>League Rankings</h3>
            <div className="metric-select">
              <label>Metric:</label>
              <select value={rankingMetric} onChange={e => setRankingMetric(e.target.value)}>
                {rankingOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <ol className="rankings-list">
            {rankingList.map((r, idx) => (
              <li key={r.team_abbr + idx} className="ranking-item">
                <span className="rank-index">{idx + 1}</span>
                <Image
                  src={teamLogoSrc(r.team_abbr)}
                  alt={`${r.team_abbr} logo`}
                  width={20}
                  height={20}
                  className="team-logo"
                />
                <span className="rank-team">{r.team_abbr}</span>
                <span className="rank-value">{typeof r.value === 'number' ? r.value : String(r.value)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  )
}
