// app/layout.tsx
import './global.css'
import { ReactNode } from 'react'
import Navbar from './components/Navbar'
import 'leaflet/dist/leaflet.css'

export const metadata = {
  title: 'My Data App',
  description: 'A simple data-oriented web app',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
