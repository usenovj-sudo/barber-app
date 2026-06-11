const LEVELS = {
  Junior:  { label: 'Junior',  color: 'bg-blue-100 text-blue-700' },
  Middle:  { label: 'Middle',  color: 'bg-yellow-100 text-yellow-700' },
  Senior:  { label: 'Senior',  color: 'bg-purple-100 text-purple-700' },
}

export default function LevelBadge({ level }) {
  const l = LEVELS[level] || LEVELS.Junior
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.color}`}>
      {l.label}
    </span>
  )
}
