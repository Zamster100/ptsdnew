import { cn } from '@/lib/utils'
import React from 'react'

export const ChevronIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="10"
      height="6"
      viewBox="0 0 10 6"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={cn(props.className)}
    >
      <path
        d="M5 6L0 0L10 0L5 6Z"
        fill="currentColor"
      />
    </svg>
  )
}
