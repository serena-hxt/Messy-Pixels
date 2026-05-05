export function AuraBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Sage blob */}
      <div
        className="aura-blob-a absolute -left-24 -top-24 h-[60vmax] w-[60vmax] rounded-full"
        style={{
          background: "radial-gradient(circle at 30% 30%, var(--sage) 0%, rgba(212,228,212,0) 65%)",
          filter: "blur(120px)",
        }}
      />
      {/* Dusty rose blob */}
      <div
        className="aura-blob-b absolute -right-32 bottom-[-20%] h-[65vmax] w-[65vmax] rounded-full"
        style={{
          background: "radial-gradient(circle at 70% 70%, var(--rose) 0%, rgba(245,230,232,0) 65%)",
          filter: "blur(120px)",
        }}
      />
      {/* Subtle paper grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.5) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.4) 1px, transparent 1px)",
          backgroundSize: "3px 3px, 7px 7px",
          backgroundPosition: "0 0, 1px 1px",
        }}
      />
    </div>
  )
}
