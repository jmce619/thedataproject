'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaBars, FaTimes } from 'react-icons/fa'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="navbar">
      <button
        className="menu-btn"
        onClick={() => setOpen(!open)}
        aria-label="Toggle menu"
      >
        {open ? <FaTimes /> : <FaBars />}
      </button>
      <span className="pipe">|</span>
      <span className="title">The Data Project</span>

      {open && (
        <div className="dropdown">
          <Link href="/" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/stock" onClick={() => setOpen(false)}>Stock Searcher</Link>
          <Link href="/page2" onClick={() => setOpen(false)}>Sports</Link>
          <Link href="/page3" onClick={() => setOpen(false)}>Politics</Link>
        </div>
      )}
    </nav>
  )
}
