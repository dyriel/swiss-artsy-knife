import Button from './Button.jsx'

// A saved palette: five colour blocks, name, tags and actions.
export default function PaletteCard({ palette, onOpen, onDelete }) {
  return (
    <li className="flex min-w-0 flex-col border-3 border-border bg-surface shadow-hard">
      <div className="flex h-20 border-b-3 border-border" role="img" aria-label={`Colours: ${palette.colors.join(', ')}`}>
        {palette.colors.map((hex, i) => (
          <div key={i} className="flex-1" style={{ background: hex }} title={hex} />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="truncate text-headline-3">{palette.name}</h3>
        <p className="font-heading text-small">{palette.colors.join('  ')}</p>
        {palette.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
            {palette.tags.map((tag) => (
              <li key={tag} className="border-2 border-border bg-accent px-1.5 text-small">
                {tag}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex gap-2 pt-1">
          {onOpen && (
            <Button size="xs" onClick={() => onOpen(palette)} aria-label={`Open ${palette.name} in Palette Studio`}>
              Open
            </Button>
          )}
          {onDelete && (
            <Button size="xs" variant="accent" onClick={() => onDelete(palette)} aria-label={`Delete ${palette.name}`}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}