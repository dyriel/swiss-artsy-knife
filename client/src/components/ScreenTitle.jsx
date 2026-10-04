import ToolIcon from './ToolIcon.jsx'

// The logo-plus-title row at the top of every tool screen (see the wireframes).
// `id` picks the icon; children go on the right (a theme picker, a filter...).
export default function ScreenTitle({ id, title, children }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {id && <ToolIcon id={id} className="size-8 shrink-0" />}
        <h1 className="text-headline-1">{title}</h1>
      </div>
      {children}
    </div>
  )
}