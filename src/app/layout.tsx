import React from 'react'
import '../styles/global.css'
import { Rubik_Glitch, Manrope } from 'next/font/google'
import { cn } from '@/lib/utils'
import { Metadata } from 'next'

const rubikGlitch = Rubik_Glitch({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-rubik-glitch',
})

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  title: 'PTSD | Home',
  description:
    'PTSD show, an animated web3 seriesThe First crypto native web 3 animated series. The show for anyone who’s ever held too long, bought the top, been rugged, rekt, or liquidated. Welcome to the diagnosis you didn’t know you had.',
  openGraph: {
    title: 'PTSD',
    description:
      'PTSD show, an animated web3 seriesThe First crypto native web 3 animated series. The show for anyone who’s ever held too long, bought the top, been rugged, rekt, or liquidated. Welcome to the diagnosis you didn’t know you had.',
    images: '/images/hero/logo.png',
    type: 'website',
    url: 'https://ptsdshow.com',
    siteName: 'PTSD',
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="scroll-smooth">
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/favicon/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon/favicon-16x16.png"
      />
      <link
        rel="manifest"
        href="/favicon/site.webmanifest"
      />
      <body
        className={cn(
          rubikGlitch.variable,
          manrope.variable,
          manrope.className,
        )}
      >
        {children}
      </body>
    </html>
  )
}
