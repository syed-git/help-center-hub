import type { SVGProps } from 'react'

type IconName = 'chat' | 'bell' | 'mail' | 'phone' | 'user' | 'home' | 'search' | 'doc' | 'clock' | 'inbox' | 'smile' | 'tray'

const PATHS: Record<IconName, string> = {
  chat: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1z',
  bell: 'M12 3a5 5 0 0 0-5 5v3.5L5 15v1h14v-1l-2-3.5V8a5 5 0 0 0-5-5zm-2 15a2 2 0 0 0 4 0',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  phone: 'M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 8a7 7 0 0 1 14 0',
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  search: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm5 11l5 5',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 4v4l3 2',
  inbox: 'M4 4h16v16H4zM4 14h4l2 3h4l2-3h4',
  smile: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM9 10h.01M15 10h.01M8.5 14a4.5 4.5 0 0 0 7 0',
  tray: 'M3 13l3-8h12l3 8v6H3zM3 13h5l2 3h4l2-3h5',
}

export function Icon({ name, size = 16, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      <path d={PATHS[name]} />
    </svg>
  )
}
