import { Outlet } from 'react-router-dom'
import { TabBar } from './TabBar'

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-[var(--color-bg)]">
      {/* Bottom padding clears the fixed tab bar. */}
      <div className="pb-20">
        <Outlet />
      </div>
      <TabBar />
    </div>
  )
}
