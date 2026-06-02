'use client'

import React, { useState, useRef, useEffect } from 'react'
import { type EpisodeData } from '@/lib/contentful/episodes'
import Image from 'next/image'
import NavigationArrows from '@/components/shared/NavigationArrows'

import { cn } from '@/lib/utils'
import { FilmIcon, XIcon, DoubleArrow, YouTubeIcon } from '@/components/icons'
import { OriginStoryDesktopBg, OriginStoryMobileBg } from '@/components/svg'

interface OriginStoryProps {
  episodes: EpisodeData[]
  ref: React.RefObject<HTMLDivElement | null>
}

const OriginStory = ({ episodes, ref }: OriginStoryProps) => {
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(0)
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null)
  const [isFirstEpisodeVisible, setIsFirstEpisodeVisible] = useState(true)
  const [isLastEpisodeVisible, setIsLastEpisodeVisible] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const desktopSliderRef = useRef<HTMLDivElement>(null)
  const firstEpisodeRef = useRef<HTMLDivElement>(null)
  const lastEpisodeRef = useRef<HTMLDivElement>(null)

  const formatDuration = (minutes: number): string => {
    const mins = Math.floor(minutes)
    const secs = Math.floor((minutes - mins) * 60)

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const isEpisodeReleased = (releaseDate: string): boolean => {
    const release = new Date(releaseDate)
    const now = new Date()

    return release <= now
  }

  const handlePrevSlide = () => {
    if (sliderRef.current) {
      const container = sliderRef.current
      const slideWidth = container.scrollWidth / episodes.length
      container.scrollBy({ left: -slideWidth, behavior: 'smooth' })
      setCurrentEpisodeIndex(Math.max(0, currentEpisodeIndex - 1))
    }
  }

  const handleNextSlide = () => {
    if (sliderRef.current) {
      const container = sliderRef.current
      const slideWidth = container.scrollWidth / episodes.length
      container.scrollBy({ left: slideWidth, behavior: 'smooth' })
      setCurrentEpisodeIndex(
        Math.min(episodes.length - 1, currentEpisodeIndex + 1),
      )
    }
  }

  // Desktop-specific scroll functions
  const handleDesktopPrevSlide = () => {
    if (desktopSliderRef.current) {
      const container = desktopSliderRef.current
      const slideWidth = container.scrollWidth / episodes.length
      container.scrollBy({ left: -slideWidth, behavior: 'smooth' })
      setCurrentEpisodeIndex(Math.max(0, currentEpisodeIndex - 1))
    }
  }

  const handleDesktopNextSlide = () => {
    if (desktopSliderRef.current) {
      const container = desktopSliderRef.current
      const slideWidth = container.scrollWidth / episodes.length
      container.scrollBy({ left: slideWidth, behavior: 'smooth' })
      setCurrentEpisodeIndex(
        Math.min(episodes.length - 1, currentEpisodeIndex + 1),
      )
    }
  }

  useEffect(() => {
    if (!firstEpisodeRef.current || !lastEpisodeRef.current) return

    const firstEpisodeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsFirstEpisodeVisible(entry.isIntersecting)
        })
      },
      {
        root: desktopSliderRef.current,
        rootMargin: '0px',
        threshold: 0.8,
      },
    )

    const lastEpisodeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsLastEpisodeVisible(entry.isIntersecting)
        })
      },
      {
        root: desktopSliderRef.current,
        rootMargin: '0px',
        threshold: 1.0,
      },
    )

    firstEpisodeObserver.observe(firstEpisodeRef.current)
    lastEpisodeObserver.observe(lastEpisodeRef.current)

    return () => {
      firstEpisodeObserver.disconnect()
      lastEpisodeObserver.disconnect()
    }
  }, [episodes.length])

  // Add scroll event listener for mobile slider to sync currentEpisodeIndex
  useEffect(() => {
    const mobileSlider = sliderRef.current
    if (!mobileSlider) return

    const handleScroll = () => {
      const scrollLeft = mobileSlider.scrollLeft
      const slideWidth = mobileSlider.scrollWidth / episodes.length
      const newIndex = Math.round(scrollLeft / slideWidth)

      if (
        newIndex !== currentEpisodeIndex &&
        newIndex >= 0 &&
        newIndex < episodes.length
      ) {
        setCurrentEpisodeIndex(newIndex)
      }
    }

    // Add passive: false to ensure the event listener works properly
    mobileSlider.addEventListener('scroll', handleScroll, { passive: false })

    return () => {
      mobileSlider.removeEventListener('scroll', handleScroll)
    }
  }, [currentEpisodeIndex, episodes.length])

  // Add scroll event listener for desktop slider to sync currentEpisodeIndex
  useEffect(() => {
    const desktopSlider = desktopSliderRef.current
    if (!desktopSlider) return

    const handleDesktopScroll = () => {
      const scrollLeft = desktopSlider.scrollLeft
      const slideWidth = desktopSlider.scrollWidth / episodes.length
      const newIndex = Math.round(scrollLeft / slideWidth)

      if (
        newIndex !== currentEpisodeIndex &&
        newIndex >= 0 &&
        newIndex < episodes.length
      ) {
        setCurrentEpisodeIndex(newIndex)
      }
    }

    // Add passive: false to ensure the event listener works properly
    desktopSlider.addEventListener('scroll', handleDesktopScroll, {
      passive: false,
    })

    return () => {
      desktopSlider.removeEventListener('scroll', handleDesktopScroll)
    }
  }, [currentEpisodeIndex, episodes.length])

  /**
   * Convert protocol-relative URLs to absolute HTTPS URLs
   */
  const getAbsoluteImageUrl = (url: string | undefined): string => {
    if (!url) return ''
    if (url.startsWith('//')) {
      return `https:${url}`
    }

    return url
  }

  /**
   * Handle episode tap to show/hide overlay on mobile
   */
  const handleEpisodeTap = (episodeId: string) => {
    if (activeEpisodeId === episodeId) {
      setActiveEpisodeId(null) // Hide overlay
    } else {
      setActiveEpisodeId(episodeId) // Show overlay
    }
  }

  return (
    <div
      ref={ref}
      className="origin-story 3xl:-mt-15 relative flex flex-col justify-end pb-16 font-sans text-white lg:-mt-10"
    >
      {/* Background images for mobile and desktop */}
      <div className="relative aspect-[375/141] w-full sm:aspect-[1920/364]">
        <OriginStoryMobileBg className="h-full w-full sm:hidden" />
        <OriginStoryDesktopBg className="hidden h-full w-full sm:block" />
      </div>
      {/* Main content container */}
      <div className="relative z-10 -mt-20 p-[15px] md:-mt-30 md:px-[60px] lg:-mt-50 2xl:-mt-60">
        <div className="">
          <h1 className="font-rubik-glitch tablet:text-[68px] text-[60px] leading-[0.9] font-normal tracking-[0em] text-transparent uppercase drop-shadow-lg [-webkit-text-stroke-color:#292A2C] [-webkit-text-stroke-width:2px] [text-stroke-color:#292A2C] [text-stroke-width:2px] sm:text-[80px] md:text-[100px] 2xl:text-[160px]">
            Season 1
          </h1>
          <div className="relative z-20 -mt-10 mb-2 flex flex-col items-start justify-between sm:-mt-16 sm:mb-0 sm:flex-row sm:items-center">
            <h2 className="font-manrope up space mb-2 text-[32px] leading-[125%] font-bold sm:bottom-2 sm:text-[40px] md:text-[52px]">
              Origin Story
            </h2>
            <div className="flex flex-col items-center gap-2 lg:flex-row lg:gap-6">
              <span className="font-manrope text-light-text border-light-text rounded-[100px] border-1 px-2 text-[14px] leading-[140%] font-bold tracking-[0] sm:text-lg">
                <span className="block sm:hidden">1 Episode</span>
                <span className="hidden sm:block">
                  {episodes.length} Episodes
                </span>
              </span>
              <div className="bg-light-bg hidden w-[1px] self-stretch sm:block"></div>
              {/* Desktop navigation arrows */}
              <NavigationArrows
                onPrev={handleDesktopPrevSlide}
                onNext={handleDesktopNextSlide}
                isPrevDisabled={isFirstEpisodeVisible}
                isNextDisabled={isLastEpisodeVisible}
                containerClassName="hidden sm:flex"
              />
            </div>
          </div>
        </div>

        {/* Episodes carousel */}
        <div className="episodes-carousel w-full pt-6 pb-0 sm:py-4">
          {/* Mobile container that shows only one episode in viewport */}
          <div className="block overflow-hidden sm:hidden">
            <div
              ref={sliderRef}
              className="episodes-scroll-container scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto"
              style={{
                scrollBehavior: 'smooth',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {episodes.map((episode, index) => {
                const isReleased = isEpisodeReleased(episode.releaseDate)
                const isYoutubeLink = !!episode.youtubeLink
                const isFirstEpisode = index === 0
                const isLastEpisode = index === episodes.length - 1

                return (
                  <div
                    key={episode.id || episode.number}
                    ref={
                      isFirstEpisode
                        ? firstEpisodeRef
                        : isLastEpisode
                          ? lastEpisodeRef
                          : undefined
                    }
                    className={cn(
                      'episode-slide flex-shrink-0 snap-start',
                      // Show all episodes for scrolling, but mobile will only show one in viewport
                      'block',
                    )}
                    style={{
                      width: 'min(435px, calc(100vw - 32px))',
                      aspectRatio: '435/272',
                    }}
                  >
                    {/* Episode card */}
                    <div
                      className="group bg-light-bg relative mb-2 cursor-pointer overflow-clip rounded-2xl"
                      onClick={() =>
                        handleEpisodeTap(
                          episode.id || episode.number.toString(),
                        )
                      }
                    >
                      <div
                        className="relative w-full"
                        style={{ aspectRatio: '435/272' }}
                      >
                        <Image
                          src={getAbsoluteImageUrl(episode.thumbnail?.url)}
                          alt={episode.title}
                          fill
                          className={cn(
                            'pointer-events-none rounded-lg object-cover opacity-100 transition-all duration-300 group-hover:scale-105 group-hover:opacity-10 group-hover:backdrop-blur-[6px]',
                            {
                              invisible: !isReleased,
                              'scale-105 opacity-10 backdrop-blur-[6px]':
                                activeEpisodeId ===
                                (episode.id || episode.number.toString()),
                            },
                          )}
                        />
                      </div>
                      {/* Watch Now overlay */}
                      <div
                        className={cn(
                          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex-col gap-2',
                          {
                            'hidden sm:group-hover:flex':
                              isReleased &&
                              activeEpisodeId !==
                                (episode.id || episode.number.toString()),
                            flex:
                              isReleased &&
                              activeEpisodeId ===
                                (episode.id || episode.number.toString()),
                            hidden: !isReleased,
                          },
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2 border-b border-white/15 pb-2">
                          <DoubleArrow className="h-3 w-3" />
                          <div className="font-manrope text-center text-base leading-[140%] font-bold sm:text-lg">
                            Watch Now
                          </div>
                          <DoubleArrow className="h-3 w-3" />
                        </div>
                        <div className="flex gap-2">
                          <button className="group/button hover:bg-main-cyan flex flex-1 transform-gpu cursor-pointer items-center justify-center rounded-lg border-1 border-white px-4 py-2 transition-all duration-500 ease-in-out hover:border-transparent hover:shadow-[0px_6px_24px_0px_#1CE8D738] sm:px-6 sm:py-2.5">
                            <a
                              href={episode.xLink}
                              target="_blank"
                            >
                              <XIcon className="h-6 w-6 transition-colors duration-500 ease-in-out group-hover/button:text-black" />
                            </a>
                          </button>
                          <button
                            className={cn(
                              'group/youtube flex flex-1 transform-gpu cursor-pointer items-center justify-center rounded-lg border-1 px-4 py-2 transition-all duration-500 ease-in-out sm:px-6 sm:py-2.5',
                              { 'border-white/15': !isYoutubeLink },
                              {
                                'hover:bg-main-cyan border-white hover:border-transparent hover:shadow-[0px_6px_24px_0px_#1CE8D738]':
                                  isYoutubeLink,
                              },
                            )}
                          >
                            <a
                              href={episode.youtubeLink}
                              target="_blank"
                            >
                              <YouTubeIcon
                                className={cn(
                                  'h-5 w-6',
                                  {
                                    'text-white group-hover/youtube:text-black':
                                      isYoutubeLink,
                                  },
                                  { 'text-white/15': !isYoutubeLink },
                                )}
                              />
                            </a>
                          </button>
                        </div>
                      </div>
                      {/* Release date overlay */}
                      <div
                        className={cn(
                          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2',
                          {
                            hidden: isReleased,
                            flex: !isReleased,
                          },
                        )}
                      >
                        <FilmIcon className="h-8 w-8" />
                        <div className="font-manrope text-base font-medium text-white">
                          Live on{' '}
                          {new Date(episode.releaseDate).toLocaleDateString(
                            'en-US',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                          ...
                        </div>
                      </div>
                      {/* Episode number badge */}
                      <div className="bg-main-black font-manrope absolute top-2 left-2 rounded-lg p-1">
                        <div className="text-center text-2xl leading-[125%] font-bold text-white">
                          {episode.number < 10
                            ? `0${episode.number}`
                            : episode.number}
                        </div>
                        <div className="text-center text-[10px] leading-[140%] font-bold text-white">
                          Episode
                        </div>
                      </div>
                      <div className="bg-main-black absolute bottom-2 left-2 rounded-[100px] px-2">
                        {formatDuration(episode.duration)}
                      </div>
                    </div>
                    <h1 className="font-manrope mb-2 text-[20px] leading-[125%] font-bold tracking-normal text-white sm:text-[24px]">
                      {episode.title}
                    </h1>
                    <p className="text-light-text font-manrope mb-6 text-[14px] leading-[140%] font-medium sm:text-base">
                      {episode.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Desktop container */}
          <div className="hidden sm:block">
            <div
              ref={desktopSliderRef}
              className="episodes-scroll-container scrollbar-hide flex snap-x snap-mandatory justify-start gap-5 overflow-x-auto"
              style={{
                scrollBehavior: 'smooth',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {episodes.map((episode, index) => {
                const isReleased = isEpisodeReleased(episode.releaseDate)
                const isYoutubeLink = !!episode.youtubeLink
                const isFirstEpisode = index === 0
                const isLastEpisode = index === episodes.length - 1

                return (
                  <div
                    key={episode.id || episode.number}
                    ref={
                      isFirstEpisode
                        ? firstEpisodeRef
                        : isLastEpisode
                          ? lastEpisodeRef
                          : undefined
                    }
                    className="episode-slide flex-shrink-0 snap-start"
                    style={{
                      width: 'min(435px, calc(100vw - 47px))',
                      aspectRatio: '435/272',
                    }}
                  >
                    {/* Episode card */}
                    <div
                      className="group bg-light-bg relative mb-2 cursor-pointer overflow-clip rounded-2xl"
                      onClick={() =>
                        handleEpisodeTap(
                          episode.id || episode.number.toString(),
                        )
                      }
                    >
                      <div
                        className="relative w-full"
                        style={{ aspectRatio: '435/272' }}
                      >
                        <Image
                          src={getAbsoluteImageUrl(episode.thumbnail?.url)}
                          alt={episode.title}
                          fill
                          className={cn(
                            'pointer-events-none rounded-lg object-cover opacity-100 transition-all duration-300 group-hover:scale-105 group-hover:opacity-10 group-hover:backdrop-blur-[6px]',
                            {
                              invisible: !isReleased,
                              'scale-105 opacity-10 backdrop-blur-[6px]':
                                activeEpisodeId ===
                                (episode.id || episode.number.toString()),
                            },
                          )}
                        />
                      </div>
                      {/* Watch Now overlay */}
                      <div
                        className={cn(
                          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex-col gap-2',
                          {
                            'hidden sm:group-hover:flex':
                              isReleased &&
                              activeEpisodeId !==
                                (episode.id || episode.number.toString()),
                            flex:
                              isReleased &&
                              activeEpisodeId ===
                                (episode.id || episode.number.toString()),
                            hidden: !isReleased,
                          },
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2 border-b border-white/15 pb-2">
                          <DoubleArrow className="h-3 w-3" />
                          <div className="font-manrope text-center text-base leading-[140%] font-bold sm:text-lg">
                            Watch Now
                          </div>
                          <DoubleArrow className="h-3 w-3" />
                        </div>
                        <div className="flex gap-2">
                          <button className="group/button hover:bg-main-cyan flex flex-1 transform-gpu cursor-pointer items-center justify-center rounded-lg border-1 border-white px-4 py-2 transition-all duration-500 ease-in-out hover:border-transparent hover:shadow-[0px_6px_24px_0px_#1CE8D738] sm:px-6 sm:py-2.5">
                            <a
                              href={episode.xLink}
                              target="_blank"
                            >
                              <XIcon className="h-6 w-6 transition-colors duration-500 ease-in-out group-hover/button:text-black" />
                            </a>
                          </button>
                          <button
                            className={cn(
                              'group/youtube flex flex-1 transform-gpu cursor-pointer items-center justify-center rounded-lg border-1 px-4 py-2 transition-all duration-500 ease-in-out sm:px-6 sm:py-2.5',
                              { 'border-white/15': !isYoutubeLink },
                              {
                                'hover:bg-main-cyan border-white hover:border-transparent hover:shadow-[0px_6px_24px_0px_#1CE8D738]':
                                  isYoutubeLink,
                              },
                            )}
                          >
                            <a
                              href={episode.youtubeLink}
                              target="_blank"
                            >
                              <YouTubeIcon
                                className={cn(
                                  'h-5 w-6',
                                  {
                                    'text-white group-hover/youtube:text-black':
                                      isYoutubeLink,
                                  },
                                  { 'text-white/15': !isYoutubeLink },
                                )}
                              />
                            </a>
                          </button>
                        </div>
                      </div>
                      {/* Release date overlay */}
                      <div
                        className={cn(
                          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2',
                          {
                            hidden: isReleased,
                            flex: !isReleased,
                          },
                        )}
                      >
                        <FilmIcon className="h-8 w-8" />
                        <div className="font-manrope text-base font-medium text-white">
                          Live on{' '}
                          {new Date(episode.releaseDate).toLocaleDateString(
                            'en-US',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                          ...
                        </div>
                      </div>
                      {/* Episode number badge */}
                      <div className="bg-main-black font-manrope absolute top-2 left-2 rounded-lg p-1">
                        <div className="text-center text-2xl leading-[125%] font-bold text-white">
                          {episode.number < 10
                            ? `0${episode.number}`
                            : episode.number}
                        </div>
                        <div className="text-center text-[10px] leading-[140%] font-bold text-white">
                          Episode
                        </div>
                      </div>
                      <div className="bg-main-black absolute bottom-2 left-2 rounded-[100px] px-2">
                        {formatDuration(episode.duration)}
                      </div>
                    </div>
                    <h1 className="font-manrope mb-2 text-[20px] leading-[125%] font-bold tracking-normal text-white sm:text-[24px]">
                      {episode.title}
                    </h1>
                    <p className="text-light-text font-manrope mb-6 text-[14px] leading-[140%] font-medium sm:text-base">
                      {episode.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[435px]">
          <NavigationArrows
            onPrev={handlePrevSlide}
            onNext={handleNextSlide}
            isPrevDisabled={currentEpisodeIndex === 0}
            isNextDisabled={currentEpisodeIndex === episodes.length - 1}
            containerClassName="flex sm:hidden"
          />
        </div>
      </div>
    </div>
  )
}

export default OriginStory
