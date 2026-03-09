import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { UserArea } from './UserArea'
import { YearSelector } from './YearSelector'

export function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <YearSelector />
          </div>
          <div className="topbar-right">
            <UserArea />
          </div>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
