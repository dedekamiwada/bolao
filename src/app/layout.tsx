import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Bolão Copa 2026",
  description: "Bolão privado da Copa do Mundo FIFA 2026",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.className} bg-background text-foreground antialiased`}>
        {children}
      </body>
    </html>
  )
}
