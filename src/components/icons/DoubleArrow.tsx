import { cn } from '@/lib/utils'
import React from 'react'

export const DoubleArrow = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={cn(props.className)}
    >
      <g clipPath="url(#clip0_1_817)">
        <path
          d="M3 7L6 10L9 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M3 1L6 4L9 1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1_817">
          <rect
            width="12"
            height="12"
            fill="white"
            transform="translate(12) rotate(90)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}
