'use client';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="bg-[var(--header)] text-[var(--header-foreground)] h-16 flex items-center justify-between px-6 shadow-md">
      <h1 className="text-xl font-semibold">Director</h1>
      <button
        onClick={onMenuClick}
        className="p-2 hover:bg-white/10 rounded-md transition-colors"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </header>
  );
}

