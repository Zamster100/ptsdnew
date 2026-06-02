import React from 'react'

interface HeroOverlayProps {
  className?: string
}

export const HeroOverlay: React.FC<HeroOverlayProps> = ({ className = '' }) => {
  return (
    <svg
      width="1920"
      height="1004"
      viewBox="0 0 1920 1004"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_f_64_655)">
        <ellipse
          cx="960"
          cy="1001.5"
          rx="960"
          ry="120.5"
          fill="#141415"
        />
      </g>
      <g filter="url(#filter1_f_64_655)">
        <rect
          x="-429"
          y="-562"
          width="1265"
          height="2084"
          rx="632.5"
          fill="#141415"
        />
      </g>
      <defs>
        <filter
          id="filter0_f_64_655"
          x="-120"
          y="761"
          width="2160"
          height="481"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood
            floodOpacity="0"
            result="BackgroundImageFix"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="60"
            result="effect1_foregroundBlur_64_655"
          />
        </filter>
        <filter
          id="filter1_f_64_655"
          x="-929"
          y="-1062"
          width="2265"
          height="3084"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood
            floodOpacity="0"
            result="BackgroundImageFix"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="250"
            result="effect1_foregroundBlur_64_655"
          />
        </filter>
      </defs>
    </svg>
  )
}
