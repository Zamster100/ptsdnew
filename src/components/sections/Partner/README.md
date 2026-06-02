# Partner Component

The `Partner` component is a horizontal, scrollable carousel that displays partners and backers information. It follows the same pattern and styling as the episodes slider used in the OriginStory component.

## Features

- **Horizontal Scrolling**: Smooth horizontal scrolling with snap-to-slide behavior
- **Navigation Arrows**: Left/right navigation buttons that disable when at the beginning/end
- **Responsive Design**: Adapts to different screen sizes with appropriate slide widths
- **Keyboard Navigation**: Arrow key support for navigation
- **Touch Support**: Mobile-friendly touch interactions
- **Intersection Observer**: Smart navigation button state management

## Props

```typescript
interface PartnersSliderProps {
  partners: PartnerData[]
}
```

## Partner Data Structure

```typescript
interface PartnerData {
  id: string
  name: string
  job: string
  picture?: {
    url?: string
    title?: string
    description?: string
  }
  createdAt: string
  updatedAt: string
}
```

## Usage

The PartnersSlider component can be used in two ways:

### 1. On the Home Page (under OriginStory)

```tsx
import Partner from '@/components/Partner'
import { getPartners } from '@/lib/contentful/partners'

export default async function Home() {
  const partners = await getPartners()

  return (
    <div className="overflow-hidden">
      <Hero />
      <OriginStory episodes={episodes} />
      <Partner partners={partners} />
    </div>
  )
}
```

### 2. On a Dedicated Partners Page

```tsx
import Partner from '@/components/Partner'
import { getPartners } from '@/lib/contentful/partners'

export default async function PartnersPage() {
  const partners = await getPartners()

  return (
    <div className="overflow-hidden">
      <Partner partners={partners} />
    </div>
  )
}
```

## Styling

The component uses Tailwind CSS classes and follows the design system:

- Background: `bg-light-bg` (dark theme)
- Text: White for names, `text-light-text` for job titles
- Navigation: Uses the shared `NavigationArrows` component
- Responsive breakpoints: Mobile-first approach with progressive enhancement

## Navigation

- **Desktop**: Navigation arrows are visible in the header
- **Mobile**: Navigation arrows are centered below the carousel
- **Keyboard**: Left/Right arrow keys for navigation
- **Touch**: Swipe gestures on mobile devices

## CSS Classes

The component adds these CSS classes to the global styles:

- `.partners-scroll-container`: Main scrollable container
- `.partner-slide`: Individual partner slide items
- Responsive width calculations for different screen sizes

## Accessibility

- Proper ARIA labels and keyboard navigation
- Focus management for navigation buttons
- Screen reader friendly structure
- High contrast design following accessibility guidelines
