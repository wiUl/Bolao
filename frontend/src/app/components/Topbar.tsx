"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/AuthContext";
import { EnablePushButton } from "@/app/components/EnablePushBottom";
import { useState } from "react";

export function Topbar({ homeHref = "/app" }: { homeHref?: string }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href={homeHref} 
            className="text-lg font-bold text-gray-900 hover:text-blue-600 transition-colors"
          >
            ⚽ FutBolão
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user?.nome && (
              <span className="text-sm text-gray-700 font-medium">
                👤 {user.nome}
              </span>
            )}
            
            <EnablePushButton />

            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-800 border border-gray-300 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              // X icon
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              // Hamburguer icon
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-2 space-y-3 border-t border-gray-200 pt-4">
            {user?.nome && (
              <div className="flex items-center gap-2 px-2 py-2 text-sm text-gray-700 bg-gray-50 rounded-lg">
                <span className="text-lg">👤</span>
                <span className="font-medium">{user.nome}</span>
              </div>
            )}
            
            <div className="px-2">
              <EnablePushButton />
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}