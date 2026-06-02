import { cn } from '@/lib/utils'
import React from 'react'

export const XIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={cn(props.className)}
    >
      <path
        d="M10.5249 14.9456L15.1707 22H22L14.3337 10.3578L20.7122 2H18.1268L13.1346 8.54L8.82927 2H2L9.32683 13.1278L2.5561 22H5.14146L10.5249 14.9456ZM16.1463 19.7778L5.90244 4.22222H7.85366L18.0976 19.7778H16.1463Z"
        fill="currentColor"
      />
    </svg>
  )
}
