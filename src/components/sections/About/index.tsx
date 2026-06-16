'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { SOCIALS } from './constant'
import { SocialLink } from '@/components/shared/SocialLink'
import { Badge } from '@/components/shared/badge'
import { ChevronIcon } from '@/components/icons'
import { cn } from '@/lib/utils'

export const About = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [paragraphHeight, setParagraphHeight] = useState<number>(0)
  const [fullContentHeight, setFullContentHeight] = useState<number>(0)
  const firstParagraph = useRef<HTMLParagraphElement>(null)
  const contentContainer = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const handleResize = () => {
      if (firstParagraph.current) {
        setParagraphHeight(firstParagraph.current.clientHeight)
      }

      if (contentContainer.current) {
        setFullContentHeight(contentContainer.current.scrollHeight)
      }
    }

    handleResize()

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [firstParagraph])

  return (
    <section
      className="small-tablet:flex-row small-tablet:gap-1 my-10 mb-10 flex w-full flex-col gap-7 px-[15px] text-white md:my-16 md:px-[60px] lg:my-20"
      id="about"
    >
      <div className="small-tablet:w-[55%] space-y-2 md:space-y-5 lg:w-1/2">
        <div
          ref={contentContainer}
          className="w-full space-y-5 overflow-hidden transition-[max-height] ease-in md:space-y-7"
          style={{
            maxHeight: isOpen ? fullContentHeight : paragraphHeight + 60,
            transitionDuration: '700ms',
          }}
        >
          <h1 className="text-xl leading-[1.25] font-bold md:text-2xl">
            About the Series
          </h1>
          <div className="text-light-text text-sm leading-[1.4] font-medium md:text-base">
            <p ref={firstParagraph}>
              PTSD (Post-Trench Stress Disorder) is an animated dark comedy
              about crypto, chaos, and the delusions that fuel both.
            </p>
            <br />
            <p>
              The story follows PT, a 20-year-old college dropout with diamond
              hands and a dream of finally making it. Fueled by ambition,
              hopium, and questionable alpha, PT dives headfirst into the
              trenches, where he will be forced to confront the only thing
              scarier than a bear market: himself.
            </p>
            <br />
            <p>
              Along the way, he's joined by a cast of fellow degenerates: Cousin
              Dick, the dumbest man alive and a self-proclaimed shitcoin oracle;
              SD, a reclusive ex-KGB cypherpunk with secrets of his own;
              ZachGPT, an AI built to expose crypto scams; and Candy, PT’s
              high-school sweetheart who still believes he’s a genius investor.
            </p>
            <br />
            <p>
              But as PT claws his way through the wreckage, he stumbles onto
              something far more dangerous than a failed pump: a hidden war for
              the soul of crypto itself. Forced to choose between delusion and
              awakening, PT begins to realize the game might be rigged far
              beyond his charts.
            </p>
            <br />
            <p>
              Created by degens, for degens, PTSD is a satirical descent into
              the madness of the market, and the systems that profit from
              keeping it broken.
            </p>
          </div>
          <div className="text-light-text flex flex-col gap-3 text-sm leading-[1.4] font-medium">
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Country</h2>
              <span className="w-[65%]">
                <Badge
                  size="ticket"
                  theme={'gray'}
                >
                  Worldwide
                </Badge>
              </span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Genre</h2>
              <span className="w-[65%] space-x-1">
                <Badge
                  size="ticket"
                  theme={'gray'}
                >
                  Comedy
                </Badge>
                <Badge
                  size="ticket"
                  theme={'gray'}
                >
                  Drama
                </Badge>
              </span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Seasons</h2>
              <span className="w-[65%]">
                2 <span className="text-gray-text">(Confirmed so far...)</span>
              </span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Total Duration</h2>
              <span className="w-[65%]">1h : 34min</span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Year</h2>
              <span className="w-[65%]">2025</span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Awards</h2>
              <span className="w-[65%]">#1 Rated Show on X</span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Restrictions</h2>
              <span className="w-[65%]">18+</span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Languages</h2>
              <span className="w-[65%]">English</span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Subtitles</h2>
              <span className="w-[65%]">
                English, Español, Türkçe, 中文, 한국어, Русский
              </span>
            </div>
            <hr className="text-light-bg" />
            <div className="flex w-full">
              <h2 className="text-gray-text w-[35%]">Picture & Sound</h2>
              <span className="w-[65%]">Full HD, HD, Sound 5.1</span>
            </div>
            <hr className="text-light-bg" />
          </div>
        </div>
        <button
          className="text-main-cyan flex cursor-pointer items-center gap-1 text-sm leading-[1.4] font-medium md:text-base"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? 'Show less' : 'Show more'}{' '}
          <ChevronIcon
            className={cn(
              'transition-transform duration-300',
              isOpen ? 'rotate-180' : '',
            )}
          />
        </button>
      </div>
      <div className="small-tablet:w-[45%] small-tablet:justify-end flex lg:w-1/2">
        <div className="small-tablet:w-auto flex w-full flex-col gap-5 md:gap-7">
          <h1 className="text-xl leading-[1.25] font-bold md:text-2xl">
            Socials
          </h1>
          <div className="flex flex-wrap justify-center gap-1.5 md:gap-3">
            {SOCIALS.map((social) => (
              <SocialLink
                key={social.name}
                href={social.href || ''}
                target="_blank"
                rel="noopener noreferrer"
              >
                <social.icon className="size-4 sm:size-6" />
              </SocialLink>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
