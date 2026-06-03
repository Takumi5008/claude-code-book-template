import dynamic from 'next/dynamic'

const SalesMap = dynamic(() => import('@/components/SalesMap'), { ssr: false })

export default function Home() {
  return <SalesMap />
}
