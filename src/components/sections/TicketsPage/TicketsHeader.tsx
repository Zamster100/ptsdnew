import Image from 'next/image'
import Link from 'next/link'
import { XIcon } from '@/components/icons/XIcon'
import { DiscordIcon } from '@/components/icons/DiscordIcon'

export const TicketsHeader = () => {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-[15px] py-4 md:px-[40px]"
      style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center">
        <Image
          src="/images/hero/logo.png"
          alt="PTSD"
          width={80}
          height={80}
          className="w-[52px] md:w-[64px] object-contain"
        />
      </Link>

      {/* Social links */}
      <div className="flex items-center gap-5">
        <a
          href="https://x.com/PTSDshow"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 transition-colors duration-200 hover:text-white"
          aria-label="Follow PTSD on X"
        >
          <XIcon className="h-5 w-5" />
        </a>
        <a
          href="https://discord.gg/PTSDshow"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/60 transition-colors duration-200 hover:text-white"
          aria-label="Join PTSD Discord"
        >
          <DiscordIcon className="h-5 w-5" />
        </a>
      </div>
    </header>
  )
}
