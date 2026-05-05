"use client"

import { useState } from "react"
import Image from "next/image"
import { Eye, EyeOff, Users, Globe, X } from "lucide-react"
import type { PrivacyLevel } from "@/lib/storage"

interface SaveModalProps {
  previewUrl: string
  defaultTitle?: string
  onSave: (data: { title: string; privacy: PrivacyLevel }) => void
  onCancel: () => void
}

const PRIVACY_OPTIONS: {
  value: PrivacyLevel
  label: string
  description: string
  icon: typeof Eye
}[] = [
  {
    value: "private",
    label: "Keep Private",
    description: "Only saved to My Gallery.",
    icon: EyeOff,
  },
  {
    value: "class",
    label: "Share with Class",
    description: "Visible to classmates in this visit.",
    icon: Users,
  },
  {
    value: "museum",
    label: "Share to Museum Wall",
    description: "Visible in the public co-creation wall.",
    icon: Globe,
  },
]

export function SaveModal({ previewUrl, defaultTitle = "", onSave, onCancel }: SaveModalProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [privacy, setPrivacy] = useState<PrivacyLevel>("private")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ title: title.trim() || "Untitled", privacy })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-3xl p-6"
        style={{
          backgroundColor: "rgba(248,249,250,0.95)",
          backdropFilter: "blur(40px) saturate(140%)",
          WebkitBackdropFilter: "blur(40px) saturate(140%)",
          border: "0.75px solid rgba(26,26,31,0.18)",
          boxShadow: "0 30px 60px -20px rgba(60,70,90,0.25)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-lg font-normal text-foreground">Save Your Creation</h2>
            <p className="mt-1 font-mono text-[11px] text-foreground/55">
              Choose how you want to keep or share this response.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/55 transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Preview + Title */}
          <div className="mt-5 flex gap-4">
            <div
              className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-white"
              style={{ border: "0.5px solid rgba(26,26,31,0.1)" }}
            >
              <Image
                src={previewUrl || "/placeholder.svg"}
                alt="Preview of your creation"
                fill
                sizes="80px"
                className="object-contain p-1.5"
                unoptimized
              />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={48}
                placeholder="Give it a name"
                className="rounded-xl border border-foreground/15 bg-background/60 px-3 py-2 font-mono text-[13px] text-foreground outline-none focus:border-foreground/40"
                autoFocus
              />
            </div>
          </div>

          {/* Privacy Options */}
          <div className="mt-5 space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45">
              Privacy
            </p>
            <div className="space-y-2">
              {PRIVACY_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = privacy === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPrivacy(option.value)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${
                      isSelected ? "ring-2 ring-foreground/30" : ""
                    }`}
                    style={{
                      backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)",
                      border: "0.5px solid rgba(26,26,31,0.1)",
                    }}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isSelected ? "bg-foreground text-background" : "bg-foreground/10 text-foreground/60"
                      }`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[13px] font-normal text-foreground">{option.label}</p>
                      <p className="font-mono text-[10px] text-foreground/55">{option.description}</p>
                    </div>
                    {isSelected && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-foreground" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/70 transition-colors hover:text-foreground"
              style={{ border: "0.5px solid rgba(26,26,31,0.18)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-full bg-foreground px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-background transition-opacity hover:opacity-90"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
