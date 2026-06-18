import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange: (value: number) => void
  size?: 'sm' | 'md' | 'lg'
  readonly?: boolean
}

const RATING_VALUES = [1, 2, 3, 4, 5]

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-8 h-8',
  lg: 'w-10 h-10'
}

export function StarRating({ value, onChange, size = 'md', readonly = false }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  function handleClick(rating: number) {
    if (!readonly) onChange(rating)
  }

  const displayValue = hovered ?? value

  return (
    <div className="flex items-center gap-0.5">
      {RATING_VALUES.map((rating) => {
        const filled = displayValue >= rating

        return (
          <button
            key={rating}
            type="button"
            disabled={readonly}
            onMouseEnter={() => !readonly && setHovered(rating)}
            onMouseLeave={() => !readonly && setHovered(null)}
            onClick={() => handleClick(rating)}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer'} focus:outline-none`}
          >
            <svg className={`${sizeClasses[size]} ${filled ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

export function DisplayRating({ value, size = 'sm' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="flex items-center gap-1">
      <StarRating value={value} onChange={() => {}} size={size} readonly />
      <span className="text-sm font-medium text-gray-600">{value.toFixed(1)}</span>
    </div>
  )
}
