'use client'
import { ReactNode } from 'react'
import { CurrentTaskProvider } from '../contexts/CurrentTaskContext'

export default function TasksLayout({ children }: { children: ReactNode }) {
  return <CurrentTaskProvider>{children}</CurrentTaskProvider>
}