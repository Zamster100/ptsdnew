import { getEpisodes } from '@/lib/contentful/episodes'
import { getPartners } from '@/lib/contentful/partners'
import Partner from '@/components/sections/Partner/Partner'
import { About } from '@/components/sections/About'
import { MainSection } from '@/components/sections/MainSection'
import { MidSection } from '@/components/sections/MidSection'

export default async function Home() {
  const episodes = await getEpisodes()
  const partners = await getPartners()

  return (
    <div className="overflow-hidden">
      <link
        rel="preload"
        href="/images/hero/sd.png"
        as="image"
        type="image/png"
        fetchPriority="high"
      />
      <link
        rel="preload"
        href="/images/hero/pt.png"
        as="image"
        type="image/png"
        fetchPriority="high"
      />
      <MainSection episodes={episodes} />
      <MidSection />
      <Partner partners={partners} />
      <About />
    </div>
  )
}
