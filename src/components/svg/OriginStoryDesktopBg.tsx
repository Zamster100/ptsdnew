import React from 'react'

interface OriginStoryDesktopBgProps {
  className?: string
}

export const OriginStoryDesktopBg: React.FC<OriginStoryDesktopBgProps> = ({
  className = '',
}) => {
  return (
    <svg
      width="1920"
      height="364"
      viewBox="0 0 1920 364"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_27_15)">
        <path
          d="M960 0C362 0 0 44 0 44V364H1920V44C1920 44 1558 0 960 0Z"
          fill="#141415"
        />
        <mask
          id="mask0_27_15"
          style={{ maskType: 'alpha' }}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="1920"
          height="364"
        >
          <path
            d="M960 0C362 0 0 44 0 44V364H1920V44C1920 44 1558 0 960 0Z"
            fill="#D9D9D9"
          />
        </mask>
        <g mask="url(#mask0_27_15)">
          <g
            opacity="0.3"
            filter="url(#filter0_f_27_15)"
          >
            <ellipse
              cx="960"
              cy="1"
              rx="960"
              ry="22"
              fill="#1CE8D7"
            />
          </g>
          <path
            d="M0 44C0 44 362 2 960 2C1558 2 1920 44 1920 44"
            stroke="url(#paint0_27_15)"
            strokeWidth="4"
          />
        </g>
      </g>
      <defs>
        <filter
          id="filter0_f_27_15"
          x="-65"
          y="-86"
          width="2050"
          height="174"
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
            stdDeviation="32.5"
            result="effect1_foregroundBlur_27_15"
          />
        </filter>
        <radialGradient
          id="paint0_27_15"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(960 2) scale(2164 49.5917)"
        >
          <stop stopColor="#00D8C6" />
          <stop
            offset="1"
            stopColor="#00D8C6"
            stopOpacity="0"
          />
        </radialGradient>
        <clipPath id="clip0_27_15">
          <rect
            width="1920"
            height="364"
            fill="white"
          />
        </clipPath>
      </defs>
    </svg>
  )
}
