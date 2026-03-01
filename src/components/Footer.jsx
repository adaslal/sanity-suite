export default function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent">
              <span className="text-xs font-bold text-white">S</span>
            </div>
            <span className="text-sm font-semibold">Sanity Suite</span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-muted hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#demo" className="text-sm text-muted hover:text-foreground transition-colors">
              Demo
            </a>
            <a
              href="https://github.com/adaslal/sanity-suite"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Sanity Suite. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
