"use client"

import { ArrowLeft, Menu } from "lucide-react"

interface TopBarProps {
  /** When provided, shows a back chevron instead of the menu icon. */
  onBack?: () => void
  /** Called when the hamburger menu icon is tapped. */
  onMenu?: () => void
}

export function TopBar({ onBack, onMenu }: TopBarProps) {
  if (onBack) {
    return (
      <header className="flex items-center justify-start px-4 pt-6 sm:px-8 md:px-12">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
        </button>
      </header>
    )
  }

  return (
    <header className="flex items-center justify-start px-4 pt-6 sm:px-8 md:px-12">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="h-5 w-5" strokeWidth={1.25} aria-hidden="true" />
      </button>
    </header>
  )
}
