"use client"
import { useState, useRef, useEffect } from "react"
import { useAuth } from '@/app/contexts/AuthContext'
import Link from "next/link"
import NotificationForm from "@/app/components/NotificationForm"

export default function ProfileDropdown() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [showNotifForm, setShowNotifForm] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!user) return null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="text-white font-medium hover:underline transition"
      >
        {user.name}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-white shadow-lg rounded-md overflow-hidden z-10">
          <button
            onClick={() => { setShowNotifForm(true); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition"
          >
            Notifications
          </button>
          <button
            onClick={() => { logout(); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 transition"
          >
            Logout
          </button>
        </div>
      )}

      <NotificationForm isOpen={showNotifForm} onClose={() => setShowNotifForm(false)} />
    </div>
  )
}