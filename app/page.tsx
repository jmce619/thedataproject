// app/page.tsx
import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="container">
      <div className="options">
        <Link href="/stock" className="option-card">
          <Image
            src="/images/page1.png"
            alt="Finance"
            width={200}
            height={200}
          />
        </Link>
        <Link href="/page2" className="option-card">
          <Image
            src="/images/page2.png"
            alt="Sports"
            width={200}
            height={200}
          />
        </Link>
        <Link href="/page3" className="option-card">
          <Image
            src="/images/page3.png"
            alt="Politics"
            width={200}
            height={200}
          />
        </Link>
        <Link href="/page4" className="option-card">
          <Image
            src="/images/page4.png"
            alt="HealthCare Insurance"
            width={200}
            height={200}
          />
        </Link>
      </div>
      <p className="all-captions">Finance – Sports – Politics - HealthCare Insurance</p>
    </div>
  )
}
