interface GemIconProps {
  size?: number
}

function GemIcon({ size = 20 }: GemIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer gem outline: flat top, wide middle, bottom point */}
      <polygon
        points="5.5,6 14.5,6 17.5,11 10,18 2.5,11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Crown facet lines */}
      <line x1="5.5" y1="6" x2="10" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="14.5" y1="6" x2="10" y2="11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      {/* Girdle line */}
      <line x1="2.5" y1="11" x2="17.5" y2="11" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

interface LogoProps {
  variant: 'sidebar' | 'auth'
  collapsed?: boolean
}

export function Logo({ variant, collapsed = false }: LogoProps) {
  if (variant === 'sidebar') {
    return (
      <>
        <span className={`logo-icon logo-icon--sidebar${collapsed ? ' logo-icon--sidebar-collapsed' : ''}`}>
          <GemIcon size={collapsed ? 22 : 18} />
        </span>
        {!collapsed && <span className="logo-wordmark logo-wordmark--sidebar">Clearline</span>}
      </>
    )
  }

  return (
    <div className="logo-auth">
      <span className="logo-icon logo-icon--auth">
        <GemIcon size={28} />
      </span>
      <span className="logo-wordmark logo-wordmark--auth">Clearline</span>
    </div>
  )
}
