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
              <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet" />

        {children}
      </body>
    </html>
  )
}
