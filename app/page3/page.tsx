import dynamic from 'next/dynamic'

// Only load on the client — avoids server/SSG errors
const DistrictResultsPage = dynamic(
  () => import('../../components/DistrictResultsPage'),
  { ssr: false }
)

export default function Page3() {
  return <DistrictResultsPage />
}
