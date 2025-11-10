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
  visitor_team: string   // may be full name or nickname or tricode
  home_team: string      // may be full name or nickname or tricode
  arena: string
  broadcaster: string
  live_period: number
  live_period_bcast: string
}

type ConfRow = {
  rank: number
  team: string        // e.g. "Boston Celtics"
  tricode: string     // e.g. "BOS"
  wins: number
  losses: number
  pct: number
  gb: string | number
  conf_record?: string
}
type StandingsPayload = {
  season: string
  east: ConfRow[]
  west: ConfRow[]
}

type AnyRow = Record<string, any>

/* ===================== Team Logo Resolution ===================== */

/** Variants that sometimes appear in feeds */
const ALT_ABBREV: Record<string, string[]> = {
  PHX: ['PHO'],
  PHO: ['PHX'],
  BKN: ['BRK'],
  BRK: ['BKN'],
  CHA: ['CHO'],
  CHO: ['CHA'],
  WAS: ['WSH'],
  WSH: ['WAS'],
  GSW: ['GS'],
  SAS: ['SA'],
  NYK: ['NY'],
}

/** Map common full names and nicknames → tricodes (uppercase) */
const NAME_TO_TRICODE: Record<string, string> = {
  // East
  'ATLANTA HAWKS': 'ATL', HAWKS: 'ATL',
  'BOSTON CELTICS': 'BOS', CELTICS: 'BOS',
  'BROOKLYN NETS': 'BKN', NETS: 'BKN',
  'CHARLOTTE HORNETS': 'CHA', HORNETS: 'CHA',
  'CHICAGO BULLS': 'CHI', BULLS: 'CHI',
  'CLEVELAND CAVALIERS': 'CLE', CAVALIERS: 'CLE', CAVS: 'CLE',
  'DETROIT PISTONS': 'DET', PISTONS: 'DET',
  'INDIANA PACERS': 'IND', PACERS: 'IND',
  'MIAMI HEAT': 'MIA', HEAT: 'MIA',
  'MILWAUKEE BUCKS': 'MIL', BUCKS: 'MIL',
  'NEW YORK KNICKS': 'NYK', KNICKS: 'NYK',
  'ORLANDO MAGIC': 'ORL', MAGIC: 'ORL',
  'PHILADELPHIA 76ERS': 'PHI', '76ERS': 'PHI', SIXERS: 'PHI',
  'TORONTO RAPTORS': 'TOR', RAPTORS: 'TOR',
  'WASHINGTON WIZARDS': 'WAS', WIZARDS: 'WAS',

  // West
  'DALLAS MAVERICKS': 'DAL', MAVERICKS: 'DAL', MAVS: 'DAL',
  'DENVER NUGGETS': 'DEN', NUGGETS: 'DEN', NUGS: 'DEN',
  'GOLDEN STATE WARRIORS': 'GSW', WARRIORS: 'GSW', DUBS: 'GSW',
  'HOUSTON ROCKETS': 'HOU', ROCKETS: 'HOU',
  'LA CLIPPERS': 'LAC', 'LOS ANGELES CLIPPERS': 'LAC', CLIPPERS: 'LAC',
  'LOS ANGELES LAKERS': 'LAL', 'LA LAKERS': 'LAL', LAKERS: 'LAL',
  'MEMPHIS GRIZZLIES': 'MEM', GRIZZLIES: 'MEM', GRIZZ: 'MEM',
  'MINNESOTA TIMBERWOLVES': 'MIN', TIMBERWOLVES: 'MIN', WOLVES: 'MIN',
  'NEW ORLEANS PELICANS': 'NOP', PELICANS: 'NOP', PELS: 'NOP',
  'OKLAHOMA CITY THUNDER': 'OKC', THUNDER: 'OKC',
  'PHOENIX SUNS': 'PHX', SUNS: 'PHX',
  'PORTLAND TRAIL BLAZERS': 'POR', 'TRAIL BLAZERS': 'POR', BLAZERS: 'POR',
  'SACRAMENTO KINGS': 'SAC', KINGS: 'SAC',
  'SAN ANTONIO SPURS': 'SAS', SPURS: 'SAS',
  'UTAH JAZZ': 'UTA', JAZZ: 'UTA',
}

/** Normalize a team string for name lookup */
function normName(s: string) {
  return s.replace(/[^A-Za-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase()
}

/** Resolve any input (tricode/full name/nickname) to a canonical tricode (uppercase) */
function resolveToTricode(input: string | undefined | null, fallback?: string): string | null {
  if (!input && !fallback) return null
  const raw = (input ?? fallback ?? '').trim()
  if (!raw) return null

  // If already looks like a tricode (3 letters), trust it
  const maybeTri = raw.toUpperCase()
  if (/^[A-Z]{3}$/.test(maybeTri)) return maybeTri

  // Try direct name/nickname map
  const key = normName(raw)
  if (NAME_TO_TRICODE[key]) return NAME_TO_TRICODE[key]

  // Sometimes feeds provide just the city ("BOSTON" → BOS, "WASHINGTON" → WAS)
  // Quick city-only guesses for common ambiguous cases
  const CITY_TO_TRI: Record<string, string> = {
    ATLANTA: 'ATL', BOSTON: 'BOS', BROOKLYN: 'BKN', CHARLOTTE: 'CHA',
    CHICAGO: 'CHI', CLEVELAND: 'CLE', DETROIT: 'DET', INDIANA: 'IND',
    MIAMI: 'MIA', MILWAUKEE: 'MIL', 'NEW YORK': 'NYK', ORLANDO: 'ORL',
    PHILADELPHIA: 'PHI', TORONTO: 'TOR', WASHINGTON: 'WAS',
    DALLAS: 'DAL', DENVER: 'DEN', HOUSTON: 'HOU', MEMPHIS: 'MEM',
    MINNESOTA: 'MIN', PHOENIX: 'PHX', PORTLAND: 'POR', SACRAMENTO: 'SAC',
    'SAN ANTONIO': 'SAS', UTAH: 'UTA', OKLAHOMA: 'OKC', 'OKLAHOMA CITY': 'OKC',
    'GOLDEN STATE': 'GSW', 'LOS ANGELES': 'LAL', 'LA': 'LAL',
  }
  if (CITY_TO_TRI[key]) return CITY_TO_TRI[key]

  return null
}

/** Given any codeOrName, return a list of tricode candidates (incl. aliases) */
function tricodeCandidates(codeOrName: string): string[] {
  const tri = resolveToTricode(codeOrName)
  if (!tri) return []
  const alts = ALT_ABBREV[tri] ?? []
  const cands = [tri, ...alts]
  return [...new Set(cands.map(c => c.toUpperCase()))]
}

/** Logo component: always tries /images/nba_logos/TRI.png (with alias fallbacks) */
function TeamLogo({
  codeOrName,
  size = 20,
  className,
  altText,
}: {
  codeOrName: string
  size?: number
  className?: string
  altText?: string
}) {
  const cands = tricodeCandidates(codeOrName)
  const [idx, setIdx] = useState(0)

  const src =
    idx < cands.length
      ? `/images/nba_logos/${cands[idx]}.png`
      : '/images/nba_logos/NBA.png'

  return (
    <Image
      src={src}
      alt={altText ?? `${codeOrName} logo`}
      width={size}
      height={size}
      className={className}
      onError={() => setIdx(i => (i + 1 <= cands.length ? i + 1 : i))}
    />
  )
}

/* ===================== Page ===================== */

export default function SportsPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [allShots, setAllShots] = useState<ShotData[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, PlayerStats>>({})
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([])
  const [standings, setStandings] = useState<StandingsPayload | null>(null)

  // Team metrics
  const [teamStats, setTeamStats] = useState<AnyRow[]>([])

  // UI state
  const [player, setPlayer] = useState('')
  const [confTab, setConfTab] = useState<'east' | 'west'>('east')

  // Sorting state for metrics
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  /* -------- Load data files -------- */
  useEffect(() => {
    fetch('/data/all_shot_data.json').then(r => r.json()).then(setAllShots).catch(console.error)
    fetch('/data/player_stats.json').then(r => r.json()).then(setStatsMap).catch(console.error)
    fetch('/data/upcoming_games.json').then(r => r.json()).then(setUpcomingGames).catch(console.error)
    fetch('/data/standings_by_conf.json').then(r => r.json()).then(setStandings).catch(console.error)
    fetch('/data/team_stats.json').then(r => r.json()).then(setTeamStats).catch(console.error)
  }, [])

  /* -------- Players dropdown -------- */
  const players = useMemo(() => {
    const shotNames = new Set(allShots.map(s => s.player_name))
    return Object.keys(statsMap).filter(name => shotNames.has(name)).sort()
  }, [allShots, statsMap])

  useEffect(() => {
    if (players.length) setPlayer(players.includes('Stephen Curry') ? 'Stephen Curry' : players[0])
  }, [players])

  /* -------- Upcoming (today or later) -------- */
  const visibleGames = useMemo(() => {
    if (!upcomingGames?.length) return []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return upcomingGames
      .filter(g => {
        const d = new Date(g.date)
        d.setHours(0, 0, 0, 0)
        return d >= today
      })
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
  }, [upcomingGames])

  /* -------- Draw hexbin shot chart -------- */
  useEffect(() => {
    if (!player) return
    const data = allShots.filter(s => s.player_name === player)
    const totalW = 720, totalH = 600
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }
    const w = totalW - margin.left - margin.right
    const h = totalH - margin.top - margin.bottom

    const svgEl = d3.select(svgRef.current)
    svgEl.selectAll('*').remove()

    const svg = svgEl
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Half-court sketch
    svg.append('rect')
      .attr('x', w/2 - 80).attr('y', h - 190)
      .attr('width', 160).attr('height', 190)
      .attr('fill','none').attr('stroke','#555').attr('stroke-width',1.5)

    svg.append('line')
      .attr('x1',0).attr('y1',h).attr('x2',w).attr('y2',h)
      .attr('stroke','#555').attr('stroke-width',1.5)

    const hb = makeHexbin<ShotData>()
      .radius(20)
      .x(d => w/2 + d.x)
      .y(d => h - d.y)

    const bins = hb(data)
    const maxCount = d3.max(bins, b => b.length) ?? 1

    const radiusScale = d3.scaleSqrt()
      .domain([0, maxCount]).range([5, hb.radius()])

    const colorScale = d3.scaleSequential()
      .domain([0,1])
      .interpolator(t => d3.interpolateRgb('#add8e6','#ff0000')(t))

    svg.append('g')
      .selectAll('path')
      .data(bins)
      .enter()
      .append('path')
      .attr('d', d => hb.hexagon(radiusScale(d.length)))
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('fill', d => {
        const att = d.reduce((s,p) => s + p.shot_attempted, 0)
        const made = d.reduce((s,p) => s + p.shot_made, 0)
        return colorScale(att ? made/att : 0)
      })
      .attr('stroke','#333').attr('stroke-width',0.2)
      .on('mouseover',(ev, d: any) => {
        const att = d.reduce((s: number,p: ShotData) => s + p.shot_attempted, 0)
        const made = d.reduce((s: number,p: ShotData) => s + p.shot_made, 0)
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

  /* -------- Team Metrics columns (robust to missing keys) -------- */
  const statColumns = useMemo(() => {
    if (!teamStats?.length) return []
    const preferred = [
      'TEAM_NAME','GP','W','L','W_PCT',
      'PTS','REB','AST','TOV','STL','BLK',
      'FG_PCT','FG3_PCT','FT_PCT',
      'OFF_RATING','DEF_RATING','NET_RATING','PACE',
      'EFG_PCT','TS_PCT','PIE'
    ]
    const keys = new Set<string>()
    teamStats.forEach(r => Object.keys(r).forEach(k => keys.add(k)))
    const ordered = preferred.filter(k => keys.has(k))
    const leftovers = [...keys].filter(k => !ordered.includes(k) && k !== 'TEAM_ID')
    return [...ordered, ...leftovers]
  }, [teamStats])

  /* -------- Inline bar min/max for a few key cols -------- */
  const barCols = new Set(['PTS','REB','AST','OFF_RATING','DEF_RATING','NET_RATING'])
  const statMinMax = useMemo(() => {
    const mm: Record<string, {min:number, max:number}> = {}
    statColumns.forEach(col => {
      if (!barCols.has(col)) return
      let min = Number.POSITIVE_INFINITY
      let max = Number.NEGATIVE_INFINITY
      teamStats.forEach(r => {
        const v = r[col]
        if (typeof v === 'number' && !isNaN(v)) {
          if (v < min) min = v
          if (v > max) max = v
        }
      })
      if (min !== Number.POSITIVE_INFINITY && max !== Number.NEGATIVE_INFINITY) {
        mm[col] = {min, max}
      }
    })
    return mm
  }, [teamStats, statColumns])

  /* -------- Sorting helpers -------- */
  function isNumberLike(v: any): boolean {
    return typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)))
  }
  function compare(a: any, b: any, dir: 'asc'|'desc') {
    const av = a ?? ''
    const bv = b ?? ''
    const na = isNumberLike(av) ? Number(av) : null
    const nb = isNumberLike(bv) ? Number(bv) : null
    let res = 0
    if (na !== null && nb !== null) res = na - nb
    else res = String(av).localeCompare(String(bv))
    return dir === 'asc' ? res : -res
  }
  function handleSort(col: string) {
    if (sortKey === col) setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(col); setSortDir('asc') }
  }

  const sortedStats = useMemo(() => {
    if (!teamStats?.length) return []
    if (!sortKey) return teamStats
    const copy = [...teamStats]
    copy.sort((r1, r2) => compare(r1[sortKey], r2[sortKey], sortDir))
    return copy
  }, [teamStats, sortKey, sortDir])

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
                    <TeamLogo
                      codeOrName={g.visitor_team}
                      size={24}
                      className="team-logo"
                      altText={`${g.visitor_team} logo`}
                    />
                    <span>{g.visitor_team}</span>
                  </div>

                  <span className="vs">vs</span>

                  <div className="team home">
                    <TeamLogo
                      codeOrName={g.home_team}
                      size={24}
                      className="team-logo"
                      altText={`${g.home_team} logo`}
                    />
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

      {/* ---------- Main 3-column content (sidebar | chart | standings) ---------- */}
      <div className="content-wrapper three-col wide-standings">
        {/* Sidebar: Player quick stats */}
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
        <div className="chart-column">
          <div className="sports-selector">
            <label htmlFor="player-select">Player:</label>
            <select
              id="player-select"
              value={player}
              onChange={e => setPlayer(e.target.value)}
            >
              {players.map(pn => (
                <option key={pn} value={pn}>{pn}</option>
              ))}
            </select>
          </div>

          <div ref={containerRef} className="chart-container">
            <svg ref={svgRef} className="shot-chart" />
            <div id="tooltip" className="tooltip"></div>
          </div>
        </div>

        {/* Standings on the right */}
        <aside className="standings-panel">
          <div className="standings-header">
            <h3>Standings</h3>
            <div className="standings-tabs">
              <button
                type="button"
                className={confTab === 'east' ? 'active' : ''}
                aria-pressed={confTab === 'east'}
                onClick={() => setConfTab('east')}
              >
                Eastern
              </button>
              <button
                type="button"
                className={confTab === 'west' ? 'active' : ''}
                aria-pressed={confTab === 'west'}
                onClick={() => setConfTab('west')}
              >
                Western
              </button>
            </div>
          </div>

          {!standings ? (
            <div className="standings-loading">Loading…</div>
          ) : (
            <>
              <div className="standings-meta">
                <small>Season: {standings.season}</small>
              </div>

              <div className="standings-table-wrap">
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>W</th>
                      <th>L</th>
                      <th>Pct</th>
                      <th>GB</th>
                      <th>Conf</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(confTab === 'east' ? standings.east : standings.west).map(row => (
                      <tr key={`${row.rank}-${row.tricode}`}>
                        <td className="standings-teamcell">
                          <TeamLogo
                            codeOrName={row.tricode || row.team}
                            size={20}
                            className="team-logo sm"
                            altText={`${row.team} logo`}
                          />
                          <span className="team-name">{row.team}</span>
                          <span className="team-tri">({row.tricode})</span>
                        </td>
                        <td className="num">{row.wins}</td>
                        <td className="num">{row.losses}</td>
                        <td className="num">{row.pct.toFixed(3)}</td>
                        <td className="num">{row.gb}</td>
                        <td>{row.conf_record ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ---------- Team Metrics (beneath main grid; width matches shot chart) ---------- */}
      <section className="metrics-panel">
        <div className="standings-header">
          <h3>Team Metrics</h3>
        </div>

        <div className="metrics-width-proxy">
          {!teamStats?.length ? (
            <div className="standings-loading">Loading…</div>
          ) : (
            <div className="standings-table-wrap pretty-table">
              <table className="standings-table metrics-table">
                <thead>
                  <tr>
                    {statColumns.map(col => {
                      const active = sortKey === col
                      const arrow = active ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''
                      return (
                        <th
                          key={col}
                          role="button"
                          tabIndex={0}
                          aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                          onClick={() => handleSort(col)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSort(col) }}
                          title="Click to sort"
                          className={/^(W_PCT|FG_PCT|FG3_PCT|FT_PCT|EFG_PCT|TS_PCT)$/.test(col) ? 'num' : undefined}
                        >
                          {col.replace(/_/g, ' ')}{arrow}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedStats.map((row, i) => (
                    <tr key={`${row.TEAM_ID ?? row.TEAM_NAME}-${i}`}>
                      {statColumns.map(col => {
                        const v = row[col]
                        const isNum = typeof v === 'number' && !isNaN(v)

                        // number formatting
                        let disp: string | number = v ?? ''
                        if (isNum) {
                          if (/PCT$/.test(col)) disp = (v * 100).toFixed(1) + '%'
                          else if (/_RATING$/.test(col)) disp = v.toFixed(1)
                          else disp = Number(v.toFixed(1))
                        }

                        // inline bar on selected numeric cols
                        const showBar = isNum && (['PTS','REB','AST','OFF_RATING','DEF_RATING','NET_RATING'] as const).includes(col as any)
                        if (showBar) {
                          const mm = statMinMax[col]!
                          const pct = mm && mm.max > mm.min ? ((v - mm.min) / (mm.max - mm.min)) * 100 : 0
                          return (
                            <td key={col} className="num barcell">
                              <div className="barwrap" title={`${col.replace(/_/g,' ')}: ${disp}`}>
                                <span className="bar" style={{ width: `${pct}%` }} />
                                <span className="val">{disp}</span>
                              </div>
                            </td>
                          )
                        }

                        return <td key={col} className={isNum ? 'num' : undefined}>{disp}</td>
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
