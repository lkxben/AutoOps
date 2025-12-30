"use client"
import Link from "next/link"
import "../globals.css"
import { useState } from "react"
import Modal from "./Modal"
import { useAuth } from '../contexts/AuthContext'
import LoginForm from "./LoginForm"

export default function NavBar() {
  const { token, logout } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  // const [showRegister, setShowRegister] = useState(false)

  return (
    <>
      <nav className="flex items-center justify-between px-6 py-4 bg-sky-300 border-b">
        <Link className="text-xl font-bold text-white" href="/">AutoOps</Link>

        {token ? (
          <div className="flex gap-4">
            <span>Logged</span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <button onClick={() => setShowLogin(true)}>Login</button>
        )}
      </nav>

      <Modal isOpen={showLogin} onClose={() => setShowLogin(false)}>
        <LoginForm onSuccess={() => setShowLogin(false)} />
      </Modal>
    </>
  );
}