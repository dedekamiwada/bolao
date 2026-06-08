import Image from "next/image"
import { cn } from "@/lib/utils"

interface TeamFlagProps {
  flagUrl: string | null | undefined
  name: string
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeMap = { sm: 20, md: 28, lg: 40 }

export function TeamFlag({ flagUrl, name, size = "md", className }: TeamFlagProps) {
  const px = sizeMap[size]

  if (!flagUrl) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-sm bg-muted text-xs font-bold",
          className
        )}
        style={{ width: px, height: Math.round(px * 0.67) }}
      >
        {name.slice(0, 3).toUpperCase()}
      </span>
    )
  }

  return (
    <Image
      src={flagUrl}
      alt={name}
      width={px}
      height={Math.round(px * 0.67)}
      className={cn("rounded-sm object-cover", className)}
      unoptimized
    />
  )
}
