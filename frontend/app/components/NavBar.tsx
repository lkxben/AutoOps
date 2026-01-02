"use client"
import Link from "next/link"
import "@/app/globals.css"
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
      <nav className="flex items-center justify-between px-6 py-4 bg-sky-300">
        <Link className="text-xl font-bold text-white" href="/">AutoOps</Link>

        {user ? (
          <div className="flex gap-4 text-white">
            <span>{user.name}</span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <div className="flex gap-4 text-white">
            <button onClick={() => setShowLogin(true)}>Login</button>
            <button onClick={() => setShowRegister(true)}>Register</button>
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
  );
}