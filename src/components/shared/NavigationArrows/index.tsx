import { LeftArrow } from '@/components/icons/LeftArrow'
import { RightArrow } from '@/components/icons/RightArrow'
import { cn } from '@/lib/utils'

interface NavigationArrowsProps {
  onPrev: () => void
  onNext: () => void
  isPrevDisabled: boolean
  isNextDisabled: boolean
  containerClassName?: string
  buttonClassName?: string
  iconClassName?: string
}

const NavigationArrows = ({
  onPrev,
  onNext,
  isPrevDisabled,
  isNextDisabled,
  containerClassName = '',
  buttonClassName = '',
  iconClassName = '',
}: NavigationArrowsProps) => {
  return (
    <div className={cn('flex gap-2', containerClassName)}>
      <button
        className={cn(
          'prev flex h-10 w-10 items-center justify-center rounded-[8px] transition-all duration-300',
          isPrevDisabled
            ? 'bg-light-bg cursor-not-allowed opacity-50'
            : 'bg-light-bg hover:bg-main-cyan cursor-pointer text-white hover:text-black hover:shadow-[0px_6px_24px_0px_#1CE8D738]',
          buttonClassName,
        )}
        onClick={onPrev}
        disabled={isPrevDisabled}
      >
        <LeftArrow
          className={cn(
            'h-5 w-5 transition-colors duration-300',
            isPrevDisabled ? 'text-[#444952]' : 'text-white',
            iconClassName,
          )}
        />
      </button>
      <button
        className={cn(
          'next flex h-10 w-10 items-center justify-center rounded-[8px] transition-all duration-300',
          isNextDisabled
            ? 'bg-light-bg cursor-not-allowed opacity-50'
            : 'bg-light-bg hover:bg-main-cyan cursor-pointer text-white hover:text-black hover:shadow-[0px_6px_24px_0px_#1CE8D738]',
          buttonClassName,
        )}
        onClick={onNext}
        disabled={isNextDisabled}
      >
        <RightArrow
          className={cn(
            'h-5 w-5 transition-colors duration-300',
            iconClassName,
          )}
        />
      </button>
    </div>
  )
}

export default NavigationArrows
