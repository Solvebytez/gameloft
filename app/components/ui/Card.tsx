interface CardProps {
  children: React.ReactNode;
  className?: string;
  height?: string;
  tabs?: Array<{
    label: string;
    onClick?: () => void;
    active?: boolean;
  }>;
}

export default function Card({ children, className = '', height, tabs }: CardProps) {
  return (
    <div
      className={`bg-[var(--retro-cream)] border-4 border-[var(--retro-dark)] rounded-lg flex flex-col overflow-hidden ${className}`}
      style={height ? { height } : {}}
    >
      {tabs && tabs.length > 0 && (
        <div className="flex border-b-4 border-[var(--retro-dark)] flex-shrink-0">
          {tabs.map((tab, index) => (
            <button
              key={index}
              type="button"
              onClick={tab.onClick}
              className={`flex-1 font-bold text-center py-3 transition-all ${
                index < tabs.length - 1 ? 'border-r-2 border-[var(--retro-dark)]' : ''
              } ${
                tab.active
                  ? 'bg-[var(--retro-accent)] text-[var(--retro-dark)]'
                  : 'bg-transparent text-[var(--retro-dark)] hover:bg-[var(--retro-accent)]/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div
        className="flex-1 overflow-y-auto p-4"
        style={{ minHeight: 0, height: '100%' }}
      >
        <div className="space-y-2 h-full flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}
