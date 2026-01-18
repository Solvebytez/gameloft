export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-[var(--card)] border-t border-[var(--border)] h-12 flex items-center px-6">
      <p className="text-sm text-gray-600">
        Copyright © {currentYear} Director. All rights reserved.
      </p>
    </footer>
  );
}

