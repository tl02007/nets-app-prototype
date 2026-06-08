import Image from "next/image"

export function NetsLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`} aria-label="NETS">
      <Image
        src="/nets-logo.png"
        alt="NETS Logo"
        width={1200}
        height={630}
        priority
        className="h-7 w-auto"
      />
    </div>
  )
}
