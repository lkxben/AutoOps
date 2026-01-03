"use client"
import Link from "next/link"
import { useState } from "react"
import Modal from "@/app/components/Modal"
import { useAuth } from '@/app/contexts/AuthContext'
import LoginForm from "@/app/components/LoginForm"
import RegisterForm from "@/app/components/RegisterForm"

export default function NavBar() {
  const { user, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-4 bg-sky-300 shadow-md">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold text-white">
            AutoOps
          </Link>
          <Link href="/tasks" className="text-white hover:underline transition">
            Dashboard
          </Link>
        </div>

        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-white font-medium">{user.name}</span>
            <button
              onClick={logout}
              className="text-white hover:underline transition"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex gap-4">
            <button
              onClick={() => setShowLogin(true)}
              className="text-white hover:underline transition"
            >
              Login
            </button>
            <button
              onClick={() => setShowRegister(true)}
              className="text-white hover:underline transition"
            >
              Register
            </button>
          </div>
        )}
      </nav>

      <Modal isOpen={showLogin} onClose={() => setShowLogin(false)}>
        <LoginForm onSuccess={() => setShowLogin(false)} />
      </Modal>

      <Modal isOpen={showRegister} onClose={() => setShowRegister(false)}>
        <RegisterForm onSuccess={() => setShowRegister(false)} />
      </Modal>
    </>
  )
}