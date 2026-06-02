import { cn } from '@/lib/utils'
import Link, { LinkProps } from 'next/link'
import React from 'react'

type SocialLinkProp = React.AnchorHTMLAttributes<HTMLAnchorElement> & LinkProps

export const SocialLink = ({
  children,
  className,
  href,
  ...props
}: SocialLinkProp) => {
  return (
    <Link
      href={href}
      className={cn(
        'hover:bg-main-cyan hover:border-main-cyan flex min-h-[42px] max-w-[72px] flex-1 transform-gpu cursor-pointer items-center justify-center gap-2 rounded-lg border-1 border-white py-2 text-white transition-all duration-500 ease-in-out hover:text-black hover:shadow-[0px_6px_24px_0px_#1CE8D738] md:min-w-[52px] lg:min-h-[48px] lg:min-w-[72px] 2xl:min-w-[92px]',
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  )
}
