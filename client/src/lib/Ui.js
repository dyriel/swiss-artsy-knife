// Tailwind class strings shared by the tool screens' forms.

export const PANEL = 'border-3 border-border bg-surface p-4 shadow-hard'
export const PANEL_HEADING = 'mb-4 text-headline-3'
export const SUBHEADING = 'mb-2 mt-6 text-headline-2'
export const NOTE = 'mt-2 text-small'

export const FIELD = 'flex min-w-0 flex-col gap-1'
export const LABEL = 'text-small font-semibold'

const FOCUS = 'focus-visible:outline-3 focus-visible:outline-border focus-visible:outline-offset-2'

export const SELECT =
  `rounded-none border-2 border-border bg-white px-2 py-1.5 font-body text-body text-text ${FOCUS}`
export const TEXT_INPUT =
  `w-full rounded-none border-2 border-border bg-white px-3 py-2 font-body text-body text-text ${FOCUS}`
export const COLOR_INPUT =
  `h-10 w-full cursor-pointer rounded-none border-2 border-border bg-white p-0.5 ${FOCUS}`
export const CHECK = 'flex items-center gap-2 text-body font-semibold'
export const CHECKBOX = `size-[18px] accent-success ${FOCUS}`
export const RANGE = `w-full accent-success ${FOCUS}`

export const ALERT =
  'my-4 list-disc border-3 border-border bg-accent py-2 pl-10 pr-4 text-small'