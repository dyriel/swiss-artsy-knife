const VARIANTS = {
  primary: 'bg-primary text-text',
  accent: 'bg-accent text-text',
  success: 'bg-success text-on-success',
}

// Type sizes follow the design system: Large 24, Medium 20, Small 16, Extra small 14.
const SIZES = {
  lg: 'text-btn-lg px-8 py-2 border-3 shadow-hard active:translate-x-1.5 active:translate-y-1.5',
  md: 'text-btn-md px-6 py-2 border-3 shadow-hard active:translate-x-1.5 active:translate-y-1.5',
  sm: 'text-btn-sm px-3.5 py-1.5 border-3 shadow-hard active:translate-x-1.5 active:translate-y-1.5',
  xs: 'text-btn-xs px-2 py-0.5 border-2 shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px]',
}

const BASE =
  'font-heading font-medium rounded-none border-border cursor-pointer ' +
  'transition-[transform,box-shadow] duration-75 active:shadow-none ' +
  'focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-3 ' +
  'disabled:bg-white disabled:text-[#9a9a9a] disabled:border-[#b5b5b5] disabled:shadow-none ' +
  'disabled:cursor-not-allowed disabled:pointer-events-none'

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
