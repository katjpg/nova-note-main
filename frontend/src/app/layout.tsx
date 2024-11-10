import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import NavBar from './components/NavBar'
import { NotesProvider } from '@/lib/contexts/NotesContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Note Taking App',
  description: 'A modern note-taking application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NotesProvider>
          <div className="min-h-screen">
            <NavBar />
            <div className="pt-24">
              {children}
            </div>
          </div>
        </NotesProvider>
      </body>
    </html>
  )
}