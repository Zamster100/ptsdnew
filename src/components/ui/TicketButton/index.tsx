import { cn } from '@/lib/utils'
import styles from './TicketButton.module.css'

export const TicketButton = ({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  return (
    <div className={styles.wrapper}>
      <button
        className={cn(styles.button, className)}
        {...props}
      >
        {children}
      </button>
    </div>
  )
}
