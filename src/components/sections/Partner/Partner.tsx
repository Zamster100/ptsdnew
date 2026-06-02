'use client'

import { useState, useRef, useEffect } from 'react'
import { type PartnerData } from '@/lib/contentful/partners'
import Image from 'next/image'
import NavigationArrows from '@/components/shared/NavigationArrows'

interface PartnerProps {
  partners: PartnerData[]
}

const Partner = ({ partners }: PartnerProps) => {
  const [currentPartnerIndex, setCurrentPartnerIndex] = useState(0)
  const [isFirstPartnerVisible, setIsFirstPartnerVisible] = useState(true)
  const [isLastPartnerVisible, setIsLastPartnerVisible] = useState(false)
  const sliderRef = useRef<HTMLDivElement>(null)
  const firstPartnerRef = useRef<HTMLDivElement>(null)
  const lastPartnerRef = useRef<HTMLDivElement>(null)

  const handlePrevSlide = () => {
    if (sliderRef.current) {
      const container = sliderRef.current
      const slideWidth = container.scrollWidth / partners.length
      container.scrollBy({ left: -slideWidth, behavior: 'smooth' })
      setCurrentPartnerIndex(Math.max(0, currentPartnerIndex - 1))
    }
  }

  const handleNextSlide = () => {
    if (sliderRef.current) {
      const container = sliderRef.current
      const slideWidth = container.scrollWidth / partners.length
      container.scrollBy({ left: slideWidth, behavior: 'smooth' })
      setCurrentPartnerIndex(
        Math.min(partners.length - 1, currentPartnerIndex + 1),
      )
    }
  }

  useEffect(() => {
    if (!firstPartnerRef.current || !lastPartnerRef.current) return

    const firstPartnerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsFirstPartnerVisible(entry.isIntersecting)
        })
      },
      {
        root: sliderRef.current,
        rootMargin: '0px',
        threshold: 0.8,
      },
    )

    const lastPartnerObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsLastPartnerVisible(entry.isIntersecting)
        })
      },
      {
        root: sliderRef.current,
        rootMargin: '0px',
        threshold: 1.0,
      },
    )

    firstPartnerObserver.observe(firstPartnerRef.current)
    lastPartnerObserver.observe(lastPartnerRef.current)

    return () => {
      firstPartnerObserver.disconnect()
      lastPartnerObserver.disconnect()
    }
  }, [partners.length])

  const getAbsoluteImageUrl = (url: string | undefined): string => {
    if (!url) return ''
    if (url.startsWith('//')) {
      return `https:${url}`
    }

    return url
  }

  return (
    <div className="partners-section relative pb-0 font-sans text-white md:pb-16">
      <div className="relative z-10 px-[15px] md:px-[60px]">
        <div className="bg-light-bg mb-4 h-[1px] w-full sm:mb-8"></div>
        <div className="mb-2 flex flex-col items-start justify-between sm:mb-6 sm:flex-row sm:items-center">
          <div className="relative">
            <h1 className="font-manrope text-[20px] leading-[125%] font-bold tracking-normal text-white sm:text-[24px]">
              Partners & Backers
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <NavigationArrows
              onPrev={handlePrevSlide}
              onNext={handleNextSlide}
              isPrevDisabled={isFirstPartnerVisible}
              isNextDisabled={isLastPartnerVisible}
              containerClassName="hidden sm:flex"
            />
          </div>
        </div>

        <div className="partners-carousel hidden w-full sm:block">
          <div
            ref={sliderRef}
            className="partners-scroll-container scrollbar-hide flex snap-x snap-mandatory gap-5 overflow-x-auto"
            style={{
              scrollBehavior: 'smooth',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {partners.map((partner, index) => {
              const isFirstPartner = index === 0
              const isLastPartner = index === partners.length - 1

              return (
                <div
                  key={partner.id}
                  ref={
                    isFirstPartner
                      ? firstPartnerRef
                      : isLastPartner
                        ? lastPartnerRef
                        : undefined
                  }
                  className="partner-slide flex-shrink-0 snap-start"
                  style={{
                    minWidth: '283px',
                    width: '283px',
                    maxWidth: '283px',
                  }}
                >
                  <div className="partner-card flex items-center gap-4">
                    <div className="flex-shrink-0">
                      {partner.picture?.url ? (
                        <div className="h-[56px] w-[56px] overflow-hidden rounded-full sm:h-[82px] sm:w-[82px]">
                          <Image
                            src={getAbsoluteImageUrl(partner.picture.url)}
                            alt={partner.picture.title || partner.name}
                            width={128}
                            height={128}
                            className="h-full w-full object-cover"
                            quality={95}
                            priority={false}
                          />
                        </div>
                      ) : (
                        <div className="bg-light-bg flex h-[56px] w-[56px] items-center justify-center rounded-full sm:h-[82px] sm:w-[82px]">
                          <div className="text-light-text text-xl font-bold">
                            {partner.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-manrope mb-1 max-w-[180px] truncate text-[14px] leading-[140%] font-bold tracking-normal text-white sm:text-[18px]">
                        {partner.name}
                      </h3>
                      <p className="font-manrope text-light-text truncate text-[14px] leading-[140%] font-medium">
                        {partner.job}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="partners-grid block w-full py-4 sm:hidden">
          <div className="grid grid-cols-2 gap-4">
            {partners.map((partner) => (
              <div
                key={partner.id}
                className="partner-grid-item"
              >
                <div className="partner-card flex flex-col items-start gap-3 text-left">
                  <div className="flex-shrink-0">
                    {partner.picture?.url ? (
                      <div className="h-16 w-16 overflow-hidden rounded-full">
                        <Image
                          src={getAbsoluteImageUrl(partner.picture.url)}
                          alt={partner.picture.title || partner.name}
                          width={128}
                          height={128}
                          className="h-full w-full object-cover"
                          quality={95}
                          priority={false}
                        />
                      </div>
                    ) : (
                      <div className="bg-light-gray/30 flex h-16 w-16 items-center justify-center rounded-full">
                        <div className="text-light-text text-lg font-medium">
                          {partner.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="w-full min-w-0">
                    <h3 className="font-manrope mb-1 truncate text-[16px] leading-[125%] font-bold tracking-normal text-white">
                      {partner.name}
                    </h3>
                    <p className="font-manrope text-light-text truncate text-[12px] leading-[140%] font-medium">
                      {partner.job}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-8 hidden w-full max-w-[283px] sm:hidden">
          <NavigationArrows
            onPrev={handlePrevSlide}
            onNext={handleNextSlide}
            isPrevDisabled={isFirstPartnerVisible}
            isNextDisabled={isLastPartnerVisible}
            containerClassName="flex"
          />
        </div>
        <div className="bg-light-bg mt-16 h-[1px] w-full"></div>
      </div>
    </div>
  )
}

export default Partner
