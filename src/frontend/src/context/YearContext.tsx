import React, { createContext, useContext, useState } from 'react'

interface YearContextValue {
  selectedYear: number
  setSelectedYear: (year: number) => void
}

const YearContext = createContext<YearContextValue | null>(null)

export function YearProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear }}>
      {children}
    </YearContext.Provider>
  )
}

export function useYear(): YearContextValue {
  const ctx = useContext(YearContext)
  if (!ctx) throw new Error('useYear must be used within YearProvider')
  return ctx
}
