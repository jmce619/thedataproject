import Link from 'next/link'
import Image from 'next/image'
import { Roboto_Mono } from 'next/font/google'

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
})

const cards = [
  { href: '/stock',  src: '/images/page1.png', alt: 'Finance',              label: 'Finance' },
  { href: '/page2',  src: '/images/page2.png', alt: 'Sports',               label: 'Sports' },
  { href: '/page3',  src: '/images/page3.png', alt: 'Politics',             label: 'Politics' },
  { href: '/page4',  src: '/images/page4.png', alt: 'HealthCare Insurance', label: 'HealthCare' },
]

export default function HomePage() {
  return (
    <div className="container">
      <div className="options">
        {cards.map((c, i) => (
          <div className="option" key={c.href}>
            <Link href={c.href} className="option-card" aria-label={c.label}>
              <Image src={c.src} alt={c.alt} width={200} height={200} />
            </Link>
            <div className={`option-title ${robotoMono.className}`}>
              {c.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
