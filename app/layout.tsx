import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SteelFlow One - Premium Steel Building CRM',
  description: 'The most intelligent CRM for the steel building industry',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
