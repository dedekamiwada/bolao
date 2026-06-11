"use client"

import { useRef, useState, type ReactNode } from "react"
// useRef apenas para coordenadas de toque (não participa do render)

interface Props {
  labels: ReactNode[]          // conteúdo dos chips do seletor (mesma ordem dos painéis)
  panels: ReactNode[]          // um painel por label (podem vir de server components)
  index?: number               // modo controlado (opcional)
  onIndexChange?: (i: number) => void
  hint?: string                // dica exibida acima do seletor, ex: "← deslize →"
}

// Carrossel com seletor de chips + swipe horizontal. Renderiza apenas o painel
// ativo (painéis de alturas muito diferentes não esticam a página) e anima a
// entrada na direção do movimento. Swipe vertical é ignorado para não brigar
// com o scroll da página.
export function PanelCarousel({ labels, panels, index, onIndexChange, hint }: Props) {
  const [internalIndex, setInternalIndex] = useState(0)
  const active = index ?? internalIndex
  const count = panels.length

  // Direção da última troca para escolher a animação de entrada
  const [direction, setDirection] = useState<"right" | "left">("right")

  function goTo(i: number) {
    if (i < 0 || i >= count || i === active) return
    setDirection(i > active ? "right" : "left")
    if (onIndexChange) onIndexChange(i)
    if (index === undefined) setInternalIndex(i)
  }

  const touchStart = useRef<{ x: number; y: number } | null>(null)
  function handleTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return
    goTo(dx < 0 ? active + 1 : active - 1)
  }

  return (
    <div>
      {hint && (
        <p className="text-[11px] text-muted-foreground text-center mb-2 select-none">{hint}</p>
      )}
      <div className="flex flex-wrap gap-1 mb-4 bg-muted rounded-lg p-1">
        {labels.map((label, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`flex-1 min-w-[2rem] rounded-md px-2 py-1 text-xs font-medium transition-colors relative ${
              active === i
                ? "bg-background shadow text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div
          key={active}
          className={direction === "right" ? "panel-slide-from-right" : "panel-slide-from-left"}
        >
          {panels[active]}
        </div>
      </div>
    </div>
  )
}
