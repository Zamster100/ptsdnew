import React from 'react'

interface TopEllipseProps {
  className?: string
}

export const TopEllipse: React.FC<TopEllipseProps> = ({ className = '' }) => {
  return (
    <svg
      width="375"
      height="189"
      viewBox="0 0 375 189"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g filter="url(#filter0_f_1_729)">
        <ellipse
          cx="187.5"
          rx="315.5"
          ry="69"
          fill="#141415"
        />
      </g>
      <defs>
        <filter
          id="filter0_f_1_729"
          x="-248"
          y="-189"
          width="871"
          height="378"
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
            result="effect1_foregroundBlur_1_729"
          />
        </filter>
      </defs>
    </svg>
  )
}
