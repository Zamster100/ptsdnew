'use client'

import React, { useRef } from 'react'
import { Hero } from '../Hero'
import OriginStory from '@/components/sections/OriginStory'
import { EpisodeData } from '@/lib/contentful/episodes'

interface MainSectionProps {
  episodes: EpisodeData[]
}

export const MainSection = ({ episodes }: MainSectionProps) => {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <>
      <Hero originStoryRef={ref} />
      <OriginStory
        episodes={episodes}
        ref={ref}
      />
    </>
  )
}
