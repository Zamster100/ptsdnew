import { cn } from '@/lib/utils'
import React from 'react'
import BG101 from '@/public/images/hero/background-101.png'
import Dick from '@/public/images/hero/dick.png'
import LamboGirls from '@/public/images/hero/lambo-girls.png'
import TheaterBg from '@/public/images/hero/theater-bg.jpg'
import Robot from '@/public/images/hero/robot.png'
import PtTiny from '@/public/images/hero/pt-tiny.png'
import SdTiny from '@/public/images/hero/sd-tiny.png'
import Image from 'next/image'
import Styles from './styles.module.css'
import { HeroOverlay, TopEllipse } from '@/components/svg'

interface AnimatedBackgroundProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const AnimatedBackground = ({
  className,
  ...props
}: AnimatedBackgroundProps) => {
  return (
    <div
      className={cn('relative aspect-[1920/1004] overflow-hidden', className)}
      {...props}
    >
      <Image
        src={BG101}
        alt="Car Background"
        width={BG101.width}
        height={BG101.height}
        className={cn(Styles.carBg, 'absolute top-0 left-0 size-full')}
      />
      <Image
        src={LamboGirls}
        alt="Lambo Girls"
        width={LamboGirls.width}
        height={LamboGirls.height}
        className={cn(
          Styles.lamboGirls,
          'absolute bottom-[5%] left-[45%] w-[67%] sm:left-[17%]',
        )}
      />
      <Image
        src={Dick}
        alt="Dick"
        width={Dick.width}
        height={Dick.height}
        className={cn(
          Styles.dick,
          'absolute top-[8%] right-[0] w-[85%] sm:right-[11%]',
        )}
      />
      <Image
        src={TheaterBg}
        alt="Theater Background"
        width={TheaterBg.width}
        height={TheaterBg.height}
        className={cn(Styles.theaterBg, 'absolute top-0 left-0 size-full')}
      />
      <Image
        src={Robot}
        alt="Robot"
        width={Robot.width}
        height={Robot.height}
        className={cn(
          Styles.robot,
          'absolute top-[1.3%] left-[60%] h-fit w-[18.85%] sm:left-[35.67%]',
        )}
      />
      <div
        className={cn(
          Styles.dickAndMarty,
          'absolute right-[6.8%] bottom-[-6.77%] aspect-[1066/786] w-[56%]',
        )}
      >
        <Image
          src={SdTiny}
          alt="PT"
          width={SdTiny.width}
          height={SdTiny.height}
          className="absolute -top-[12%] -right-[20%] h-[100%] w-fit sm:-right-[15%]"
        />
        <Image
          src={PtTiny}
          alt="PT"
          width={PtTiny.width}
          height={PtTiny.height}
          className="absolute top-0 left-[6%] h-[90%] w-fit sm:-left-[4%]"
        />
      </div>
      <div className="absolute hidden h-full w-full md:block">
        <HeroOverlay className="h-full w-full" />
      </div>
      <div className="absolute aspect-[750/378] w-full md:hidden">
        <TopEllipse className="h-full w-full" />
      </div>
    </div>
  )
}
