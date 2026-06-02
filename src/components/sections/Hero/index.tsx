'use client'
import { StarIcon, TopTenIcon } from '@/components/icons'
import { Badge } from '@/components/shared/badge'
import { Button } from '@/components/ui/Button'
import React from 'react'
import { AnimatedBackground } from './components/AnimatedBackground'
import { PlayIcon } from '@/components/icons/PlayIcon'
import Image from 'next/image'
import Logo from '@/public/images/hero/logo.png'
import { TicketButton } from '@/components/ui/TicketButton'

interface HeroProps {
  originStoryRef: React.RefObject<HTMLDivElement | null>
}

export const Hero = ({ originStoryRef }: HeroProps) => {
  const handlePlay = () => {
    if (originStoryRef.current) {
      originStoryRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleTickets = () => {
    document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="hero">
      {/* Desktop */}
      <div className="relative hidden md:block">
        <Badge className="absolute right-[3%] bottom-[6%] z-10 flex items-center gap-2">
          <StarIcon className="size-4 lg:size-5" />
          <span>Starring PT, SD, ZachGPT, Cousin Dick and more</span>
        </Badge>
        <Badge className="absolute right-[calc(3%+380px)] bottom-[6%] z-10 flex items-center gap-2 lg:right-[calc(3%+480px)]">
          <TopTenIcon className="size-4 lg:size-5" />
          <span>#1 Rated show on X</span>
        </Badge>
        <AnimatedBackground className="w-full" />
        <div className="absolute top-0 left-0 flex h-full w-[50%] flex-col justify-center gap-[18px] px-10 text-xs text-white lg:text-base xl:text-lg 2xl:px-16">
          {/* <h1 className="font-rubik-glitch text-main-cyan z-10 w-fit text-[70px] leading-[0.9] select-none lg:text-[100px] xl:text-[130px] 2xl:text-[160px]">
            PTSD
          </h1> */}
          <Image
            src={Logo}
            alt="Logo"
            width={Logo.width}
            height={Logo.height}
            className="z-10 w-full max-w-[480px]"
          />
          <div className="z-10 flex items-center gap-1.5 font-bold lg:gap-2.5 xl:gap-4">
            <span className="text-main-green">69% Match</span>
            <div className="bg-light-bg h-5 w-px" />
            <span>2025</span>
            <div className="bg-light-bg h-5 w-px" />
            <span>12 Episodes</span>
            <div className="bg-light-bg h-5 w-px" />
            <Badge
              theme="gray"
              size="sm"
            >
              18+
            </Badge>
            <div className="bg-light-bg h-5 w-px" />
            <div className="flex items-center gap-1.5">
              <Badge
                theme="outline"
                size="sm"
              >
                HD
              </Badge>
              <Badge
                theme="outline"
                size="sm"
              >
                5.1
              </Badge>
            </div>
          </div>
          <div className="z-10 max-w-[580px] space-y-1.5 text-white">
            <h1 className="text-lg leading-[1.25] font-bold lg:text-xl xl:text-2xl">
              Animated Web3 Series
            </h1>
            <p className="text-light-gray leading-[1.4]">
              The show for anyone who’s ever held too long, bought the top, been
              rugged, rekt, or liquidated. Welcome to the diagnosis you didn’t
              know you had.
            </p>
          </div>
          <div className="z-10 mt-0 flex items-center gap-4 lg:mt-5 xl:mt-[42px]">
            <Button
              className="flex items-center justify-center gap-4"
              onClick={handlePlay}
            >
              <PlayIcon className="size-6 xl:size-10" />
              Play
            </Button>
            <TicketButton onClick={handleTickets}>TICKETS</TicketButton>
          </div>
        </div>
      </div>
      {/* Mobile */}
      <MobileHero handlePlay={handlePlay} handleTickets={handleTickets} />
    </section>
  )
}

const MobileHero = ({
  handlePlay,
  handleTickets,
}: {
  handlePlay: () => void
  handleTickets: () => void
}) => {
  return (
    <div className="relative md:hidden">
      <Badge
        rounded="right"
        className="absolute top-[15px] left-0 z-10 flex items-center gap-2"
      >
        <StarIcon />
        <span>Starring PT, SD, ZachGPT, Cousin Dick</span>
      </Badge>
      <Badge
        rounded="right"
        className="absolute top-[45px] left-0 z-10 flex items-center gap-2"
      >
        <TopTenIcon />
        <span>#1 Rated show on X</span>
      </Badge>
      <div className="relative aspect-[375/379]">
        <AnimatedBackground className="absolute top-0 right-0 h-full" />
      </div>
      <div className="xs:text-sm relative -mt-[12%] flex w-full flex-col gap-[18px] px-[15px] text-xs text-white">
        <div
          className="absolute -top-10 left-0 h-[66%] w-[200%] -translate-x-[30%]"
          style={{
            background: 'radial-gradient(#141414, #141414, transparent)',
            borderRadius: '100%',
            filter: 'blur(30px)',
          }}
        />
        {/* <h1 className="font-rubik-glitch text-main-cyan z-10 w-fit text-[100px] leading-[0.9] select-none">
          PTSD
        </h1> */}
        <Image
          src={Logo}
          alt="Logo"
          width={Logo.width}
          height={Logo.height}
          className="z-10 w-fit"
        />
        <div className="tablet:justify-start z-10 flex items-center justify-between gap-1.5 font-bold">
          <span className="text-main-green">69% Match</span>
          <div className="bg-light-bg h-5 w-px" />
          <span>2025</span>
          <div className="bg-light-bg h-5 w-px" />
          <span>12 Episodes</span>
          <div className="bg-light-bg h-5 w-px" />
          <Badge
            theme="gray"
            size="sm"
          >
            18+
          </Badge>
          <div className="bg-light-bg h-5 w-px" />
          <div className="flex items-center gap-1">
            <Badge
              theme="outline"
              size="sm"
            >
              HD
            </Badge>
            <Badge
              theme="outline"
              size="sm"
            >
              5.1
            </Badge>
          </div>
        </div>
        <div className="z-10 space-y-1.5 text-white">
          <h1 className="text-xl leading-[1.25] font-bold">
            Animated Web3 Series
          </h1>
          <p className="text-light-gray text-justify leading-[1.4]">
            The show for anyone who’s ever held too long, bought the top, been
            rugged, rekt, or liquidated. Welcome to the diagnosis you didn’t
            know you had.
          </p>
        </div>
        <div className="mt-3 mb-8 flex items-center gap-3">
          <Button
            className="flex items-center justify-center gap-2"
            onClick={handlePlay}
          >
            <PlayIcon className="size-6" />
            Play
          </Button>
          <TicketButton onClick={handleTickets}>TICKETS</TicketButton>
        </div>
      </div>
    </div>
  )
}
