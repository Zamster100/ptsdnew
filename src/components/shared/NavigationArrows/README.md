# NavigationArrows Component

A reusable navigation arrows component that provides previous and next navigation functionality with customizable styling.

## Props

| Prop                 | Type         | Required | Default | Description                                     |
| -------------------- | ------------ | -------- | ------- | ----------------------------------------------- |
| `onPrev`             | `() => void` | Yes      | -       | Function called when previous button is clicked |
| `onNext`             | `() => void` | Yes      | -       | Function called when next button is clicked     |
| `isPrevDisabled`     | `boolean`    | Yes      | -       | Whether the previous button should be disabled  |
| `isNextDisabled`     | `boolean`    | Yes      | -       | Whether the next button should be disabled      |
| `containerClassName` | `string`     | No       | `''`    | Additional CSS classes for the container div    |
| `buttonClassName`    | `string`     | No       | `''`    | Additional CSS classes for both buttons         |
| `iconClassName`      | `string`     | No       | `''`    | Additional CSS classes for both icons           |

## Usage

```tsx
import NavigationArrows from '@/components/shared/NavigationArrows'

// Basic usage
<NavigationArrows
  onPrev={handlePrevSlide}
  onNext={handleNextSlide}
  isPrevDisabled={currentIndex === 0}
  isNextDisabled={currentIndex >= maxIndex}
/>

// With custom styling
<NavigationArrows
  onPrev={handlePrevSlide}
  onNext={handleNextSlide}
  isPrevDisabled={currentIndex === 0}
  isNextDisabled={currentIndex >= maxIndex}
  containerClassName="mt-4"
  buttonClassName="h-12 w-12"
  iconClassName="h-6 w-6"
/>
```

## Features

- **Responsive Design**: Automatically adapts button states based on disabled props
- **Customizable Styling**: Accepts className props for container, buttons, and icons
- **Accessibility**: Proper disabled states and cursor changes
- **Hover Effects**: Built-in hover animations and color transitions
- **TypeScript Support**: Fully typed with TypeScript interfaces

## Styling

The component uses Tailwind CSS classes and can be customized through the className props. The base styling includes:

- Flexbox layout with gap spacing
- Rounded corners and transitions
- Hover effects with color changes
- Disabled state styling
- Responsive button sizes
