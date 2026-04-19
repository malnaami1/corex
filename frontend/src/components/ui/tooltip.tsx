import * as React from "react"

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipContent({ children }: { children: React.ReactNode }) {
  return <div className="bg-black text-white text-xs rounded px-2 py-1">{children}</div>
}
