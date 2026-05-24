import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'DrukPass — Bhutan Tourism Intelligence',
  description: 'Agentic AI platform for Bhutan tourism regulatory workflows. Automated permit processing, SDF calculation, and compliance management.',
  keywords: 'Bhutan, tourism, permit, SDF, DrukPass, government',
  authors: [{ name: 'Tourism Council of Bhutan' }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'DrukPass — Bhutan Tourism Intelligence',
    description: 'Automated. Compliant. Instant.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F9F6F0] text-[#374151] antialiased">
        {children}
      </body>
    </html>
  )
}
