import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ScratchCard } from './ScratchCard'

export const MidSection = () => {
  return (
    <section id="tickets-section" className="px-[15px] pb-16 font-sans text-white md:px-[60px]">
      <div className="bg-light-bg mb-10 h-[1px] w-full sm:mb-14" />

      <div className="flex flex-col gap-10 md:flex-row md:items-center md:gap-16">
        {/* Left: text */}
        <div className="flex flex-col gap-6 md:w-1/2">
          <h2 className="font-manrope text-[36px] font-bold leading-[1.1] sm:text-[44px] md:text-[52px] lg:text-[60px]">
            <span className="text-ticket-red">Non-Fuddable</span>
            <br />
            Tickets
          </h2>
          <p className="text-light-text font-manrope max-w-lg text-base leading-[1.65] font-medium md:text-lg">
            Your front-row seat to the world&apos;s first crypto comedy series.
            Hold a ticket, get airdropped PTSD tokens at TGE, and unlock first
            dibs on every drop, perk, and plotline that follows.
          </p>
          <Link href="/tickets">
            <Button
              variant="outline"
              className="border-transparent bg-white px-8 py-4 text-base font-bold text-black shadow-[0_0_18px_rgba(249,115,22,0.45)] hover:shadow-[0_0_28px_rgba(249,115,22,0.65)] xl:min-h-[60px] xl:min-w-[180px] xl:text-lg"
            >
              Learn More
            </Button>
          </Link>
        </div>

        {/* Right: scratch-off image */}
        <div className="md:w-1/2">
          <ScratchCard
            imageSrc="/images/hero/tickets-vip.jpg"
            alt="PT holding PTSD tickets at the VIP entrance"
          />
        </div>
      </div>

      <div className="bg-light-bg mt-16 h-[1px] w-full" />
    </section>
  )
}
