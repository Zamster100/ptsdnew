import React from 'react'

interface OriginStoryMobileBgProps {
  className?: string
}

export const OriginStoryMobileBg: React.FC<OriginStoryMobileBgProps> = ({
  className = '',
}) => {
  return (
    <svg
      width="375"
      height="141"
      viewBox="0 0 375 141"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_94_914)">
        <path
          d="M187.5 0C70.7031 0 0 17.044 0 17.044V141H375V17.044C375 17.044 304.297 0 187.5 0Z"
          fill="#141415"
        />
        <mask
          id="mask0_94_914"
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="375"
          height="141"
        >
          <path
            d="M187.5 0C70.7031 0 0 17.044 0 17.044V141H375V17.044C375 17.044 304.297 0 187.5 0Z"
            fill="#D9D9D9"
          />
        </mask>
        <g mask="url(#mask0_94_914)">
          <g
            opacity="0.3"
            filter="url(#filter0_f_94_914)"
          >
            <ellipse
              cx="188"
              cy="1"
              rx="372"
              ry="12"
              fill="#1CE8D7"
            />
          </g>
          <path
            d="M0 17C0 17 70.7031 1 187.5 1C304.297 1 375 17 375 17"
            stroke="url(#paint0_radial_94_914)"
            strokeWidth="2"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_f_94_914"
          x="-209.188"
          y="-36.1875"
          width="794.375"
          height="74.375"
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
            stdDeviation="12.5938"
            result="effect1_foregroundBlur_94_914"
          />
        </filter>
        <radialGradient
          id="paint0_radial_94_914"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(187.5 1) scale(422.656 18.8921)"
        >
          <stop stopColor="#00D8C6" />
          <stop
            offset="1"
            stopColor="#00D8C6"
            stopOpacity="0"
          />
        </radialGradient>
        <clipPath id="clip0_94_914">
          <rect
            width="375"
            height="141"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
  )
}
