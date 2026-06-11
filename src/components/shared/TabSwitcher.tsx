"use client"

import { useState, type ReactNode } from "react"

interface Props {
  tabs: { label: string; content: ReactNode }[]
  initialTab?: number
}

// Abas simples para alternar entre conteúdos renderizados no servidor.
// O conteúdo das abas chega pronto como ReactNode (server components),
// então só a troca de visualização roda no cliente.
export function TabSwitcher({ tabs, initialTab = 0 }: Props) {
  const [active, setActive] = useState(initialTab)

  return (
    <div>
      <div className="flex rounded-lg bg-muted p-1 mb-4">
        {tabs.map((tab, idx) => (
          <button
            key={tab.label}
            onClick={() => setActive(idx)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              active === idx
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, idx) => (
        <div key={tab.label} className={active === idx ? "" : "hidden"}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}
