import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import styles from './Button.module.css'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, variant = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={cn(
          'w-fit cursor-pointer rounded-[16px] leading-[1]',
          variant === 'default' && [
            styles.colorsEffect,
            'min-h-[59px] min-w-[144px] text-xl font-extrabold text-black xl:min-h-[92px] xl:min-w-[224px] xl:text-[32px]',
          ],
          variant === 'outline' &&
            'font-manrope border border-white/40 bg-transparent px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:border-white/80',
          className,
        )}
      >
        {children}
      </button>
    )
  },
)
