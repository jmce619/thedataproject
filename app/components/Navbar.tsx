'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaBars, FaTimes } from 'react-icons/fa'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const BarsIcon = FaBars as React.ElementType
  const TimesIcon = FaTimes as React.ElementType

  return (
    <nav className="navbar">
      {/* Left side: Menu and Title */}
      <div className="navbar-left">
        <button
          className="menu-btn"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <TimesIcon /> : <BarsIcon />}
        </button>
        <span className="pipe">|</span>
        <span className="title">The Data Project</span>
      </div>

      {/* Right side: About + GitHub (always visible) */}
      <div className="navbar-right">
        <Link href="/about" className="nav-link">About</Link>
        <a
          href="https://github.com/jmce619/thedataproject"
          target="_blank"
          rel="noopener noreferrer"
          className="nav-link"
        >
          GitHub
        </a>
      </div>

      {/* Dropdown menu – mobile nav links */}
      {open && (
        <div className="dropdown">
          <Link href="/" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/stock" onClick={() => setOpen(false)}>Finance</Link>
          <Link href="/page2" onClick={() => setOpen(false)}>Sports</Link>
          <Link href="/page3" onClick={() => setOpen(false)}>Demographic</Link>
          <Link href="/page4" onClick={() => setOpen(false)}>HealthCare</Link>
        </div>
      )}

      {/* Bottom border line */}
      <div className="navbar-bottom-line" />
    </nav>
  )
}
