'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import * as d3 from 'd3'
import { hexbin as makeHexbin } from 'd3-hexbin'
import Image from 'next/image'

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

export default function SportsPage() {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [allShots, setAllShots] = useState<ShotData[]>([])
  const [statsMap, setStatsMap] = useState<Record<string, PlayerStats>>({})
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([])
  const [player, setPlayer] = useState('')

  // Load shot data
  useEffect(() => {
    fetch('/data/all_shot_data.json')
      .then(r => r.json())
      .then(setAllShots)
      .catch(console.error)
  }, [])

  // Load player stats
  useEffect(() => {
    fetch('/data/player_stats.json')
      .then(r => r.json())
      .then(setStatsMap)
      .catch(console.error)
  }, [])

  // Load upcoming games
  useEffect(() => {
    fetch('/data/upcoming_games.json')
      .then(r => r.json())
      .then(setUpcomingGames)
      .catch(console.error)
  }, [])

  // Dropdown players: intersection of shots & stats
  const players = useMemo(() => {
    const shotNames = new Set(allShots.map(s => s.player_name))
    return Object.keys(statsMap)
      .filter(name => shotNames.has(name))
      .sort()
  }, [allShots, statsMap])

  // Default selection
  useEffect(() => {
    if (players.length) {
      setPlayer(players.includes('Stephen Curry') ? 'Stephen Curry' : players[0])
    }
  }, [players])

  // Draw hexbin
  useEffect(() => {
    if (!player) return
    const data = allShots.filter(s => s.player_name === player)
    const totalW = 600, totalH = 560
    const margin = { top: 20, right: 20, bottom: 20, left: 20 }
    const w = totalW - margin.left - margin.right
    const h = totalH - margin.top - margin.bottom

    const svgEl = d3.select(svgRef.current)
    svgEl.selectAll('*').remove()

    const svg = svgEl
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Court
    svg.append('rect')
      .attr('x', w/2 - 80).attr('y', h - 190)
      .attr('width', 160).attr('height', 190)
      .attr('fill','none').attr('stroke','#555').attr('stroke-width',1.5)

    svg.append('line')
      .attr('x1',0).attr('y1',h).attr('x2',w).attr('y2',h)
      .attr('stroke','#555').attr('stroke-width',1.5)

    // Hexbin
    const hb = makeHexbin<ShotData>()
      .radius(20)
      .x(d => w/2 + d.x)
      .y(d => h - d.y)

    const bins = hb(data)
    const maxCount = d3.max(bins, b => b.length) || 1

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

  return (
    <div className="sports-dashboard">
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

      {/* Main content: chart + upcoming games side by side */}
      <div className="main-content">
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

        {/* Upcoming Games panel on the right */}
        {/* Upcoming Games panel on the right */}
        <section className="upcoming-games">
          <h3>Upcoming Games</h3>
          <div className="games-row">
            {upcomingGames.map(g => (
              <div key={g.game_id} className="game-card">
                <time className="game-date">
                  {new Date(g.date).toLocaleDateString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                  {' '}
                  <span className="game-time">{g.time}</span>
                </time>

                <div className="game-teams">
                  {/* Visitor */}
                  <div className="team visitor">
                    <Image
                      src={`/images/nba_logos/${g.visitor_team}.png`}
                      alt={`${g.visitor_team} logo`}
                      width={24}
                      height={24}
                      className="team-logo"
                    />
                    <span>{g.visitor_team}</span>
                  </div>

                  <span className="vs">vs</span>

                  {/* Home */}
                  <div className="team home">
                    <Image
                      src={`/images/nba_logos/${g.home_team}.png`}
                      alt={`${g.home_team} logo`}
                      width={24}
                      height={24}
                      className="team-logo"
                    />
                    <span>{g.home_team}</span>
                  </div>
                </div>

                <div className="game-records">
                  <small>{g.arena}</small><br/>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
