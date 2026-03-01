'use client';
import { useState } from 'react';

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Sanity Suite
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#demo" className="text-sm text-muted hover:text-foreground transition-colors">
            Live Demo
          </a>
          <a
            href="https://github.com/adaslal/sanity-suite"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://abhilash38.gumroad.com/l/jdenr"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-light"
          >
            Get It — $29
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex flex-col gap-1.5 md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block h-0.5 w-6 bg-foreground transition-transform ${mobileOpen ? 'translate-y-2 rotate-45' : ''}`} />
          <span className={`block h-0.5 w-6 bg-foreground transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
          <span className={`block h-0.5 w-6 bg-foreground transition-transform ${mobileOpen ? '-translate-y-2 -rotate-45' : ''}`} />
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background px-6 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <a href="#features" className="text-sm text-muted hover:text-foreground" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#how-it-works" className="text-sm text-muted hover:text-foreground" onClick={() => setMobileOpen(false)}>How It Works</a>
            <a href="#demo" className="text-sm text-muted hover:text-foreground" onClick={() => setMobileOpen(false)}>Live Demo</a>
            <a href="https://github.com/adaslal/sanity-suite" target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-foreground" onClick={() => setMobileOpen(false)}>GitHub</a>
            <a href="https://abhilash38.gumroad.com/l/jdenr" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white text-center" onClick={() => setMobileOpen(false)}>Get It — $29</a>
          </div>
        </div>
      )}
    </header>
  );
}
