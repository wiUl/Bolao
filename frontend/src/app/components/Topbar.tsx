"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/AuthContext";
import { EnablePushButton } from "@/app/components/EnablePushBottom";
import { useState } from "react";

export function Topbar({ homeHref = "/app" }: { homeHref?: string }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b"
      style={{
        background: "var(--topbar-bg)",
        borderColor: "var(--topbar-border)",
        color: "var(--topbar-text)",
      }}
    >
      <div className="px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href={homeHref} 
            className="flex items-center gap-2 transition-colors"
            style={{
              color: "var(--topbar-text)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--topbar-link-hover)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--topbar-text)")}
          >
             <img 
                src="/favicon.ico" 
                alt="FutBolão" 
                className="w-6 h-6 rounded-full"
              />  <span className="text-lg font-bold">FutBolão</span>
             
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            {user?.nome && (
              <span className="text-sm font-medium" style={{ color: "var(--topbar-muted-text)" }}>
                👤 {user.nome}
              </span>
            )}
            
            <EnablePushButton />

            <button
              onClick={logout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent shadow-sm hover:shadow-md rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg transition-colors"
            style={{
              color: "var(--topbar-muted-text)",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--topbar-hover-bg)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
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
          <div
            className="md:hidden mt-4 pb-2 space-y-3 border-t pt-4"
            style={{ borderColor: "var(--topbar-border)" }}
          >
            {user?.nome && (
              <div
                className="flex items-center gap-2 px-2 py-2 text-sm rounded-lg"
                style={{
                  color: "var(--topbar-muted-text)",
                  background: "var(--topbar-hover-bg)",
                  border: "1px solid var(--topbar-border)",
                }}
>
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