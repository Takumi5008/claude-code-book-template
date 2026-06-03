import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '営業マップ',
  description: '訪問販売 物件ピンマップ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
