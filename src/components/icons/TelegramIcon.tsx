import { cn } from '@/lib/utils'
import React from 'react'

export const TelegramIcon = (props: React.SVGProps<SVGSVGElement>) => {
  return (
    <svg
      width="25"
      height="24"
      viewBox="0 0 25 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      className={cn(props.className)}
    >
      <g clipPath="url(#clip0_2019_77)">
        <path
          d="M20.6251 3.15892C20.6251 3.15892 22.6601 2.37978 22.4899 4.27183C22.4338 5.05097 21.9252 7.77822 21.5292 10.7276L20.1725 19.4653C20.1725 19.4653 20.0594 20.7454 19.0416 20.968C18.0244 21.1902 16.498 20.1889 16.2151 19.9662C15.9888 19.7991 11.9754 17.2945 10.5621 16.0705C10.1661 15.7362 9.71353 15.0687 10.6187 14.2896L16.5545 8.72398C17.2329 8.05542 17.9112 6.49714 15.0847 8.3897L7.16988 13.6765C7.16988 13.6765 6.26526 14.2335 4.56967 13.7326L0.894586 12.6192C0.894586 12.6192 -0.462093 11.7845 1.85579 10.9498C7.50932 8.33416 14.463 5.66297 20.6246 3.15841"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_2019_77">
          <rect
            width="24"
            height="24"
            fill="currentColor"
            transform="translate(0.5)"
          />
        </clipPath>
      </defs>
    </svg>
  )
}
