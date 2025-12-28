"use client";
import React from "react";
import Link from "next/link";

interface NavBarProps {
  user?: { id: string; name: string } | null;
}

export default function NavBar({ user }: NavBarProps) {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow">
      <div className="text-xl font-bold text-gray-800">
        <Link href="/">AutoOps</Link>
      </div>
      {!user && (
        <div className="space-x-4">
          <Link href="/login">
            <button className="px-4 py-2 bg-charcoal-400 hover:bg-gray-500 text-white rounded">
              Log In
            </button>
          </Link>
          <Link href="/register">
            <button className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded">
              Register
            </button>
          </Link>
        </div>
      )}
    </nav>
  );
}