import React from 'react'
import { cva, VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'w-fit font-bold text-xs xs:text-sm lg:text-lg leading-[1.4]',
  {
    variants: {
      theme: {
        light: 'bg-white text-black',
        dark: 'bg-black text-white',
        gray: 'bg-light-bg text-white',
        outline: 'border border-light-gray text-light-gray',
      },
      size: {
        default: 'px-2.5 md:px-3.5 py-0.5 md:py-1.5',
        sm: 'px-1.5 md:px-2 py-0',
        ticket: 'px-2.5 py-0.5 !text-sm',
      },
      rounded: {
        full: 'rounded-[100px]',
        left: 'rounded-l-[100px] rounded-r-none pr-[15px]',
        right: 'rounded-r-[100px] rounded-l-none pl-[15px]',
      },
    },
    defaultVariants: {
      rounded: 'full',
      theme: 'light',
      size: 'default',
    },
  },
)

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>

export const Badge = ({
  children,
  className,
  rounded,
  size,
  theme,
  ...props
}: BadgeProps) => {
  return (
    <span
      className={cn(badgeVariants({ rounded, theme, size }), className)}
      {...props}
    >
      {children}
    </span>
  )
}
