import { useState } from 'react'
import { useYear } from '../../context/YearContext'
import BudgetOverview from './BudgetOverview'
import BudgetCategories from './BudgetCategories'

const TABS = ['Overview', 'Categories'] as const
type Tab = typeof TABS[number]

export default function Budget() {
  const { selectedYear } = useYear()
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Budget — {selectedYear}</h1>
      </div>

      <nav className="tabs" aria-label="Budget tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
            aria-selected={activeTab === tab}
            role="tab"
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="tab-content" role="tabpanel">
        {activeTab === 'Overview' && <BudgetOverview />}
        {activeTab === 'Categories' && <BudgetCategories />}
      </div>
    </div>
  )
}
