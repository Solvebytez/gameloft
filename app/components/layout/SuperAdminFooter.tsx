export default function SuperAdminFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-[#f5f1e8] border-t-4 border-[#2d2d2d] h-12 flex items-center px-6">
      <p className="text-sm text-[#2d2d2d] font-semibold">
        Copyright © {currentYear} Gameloft Super Admin. All rights reserved.
      </p>
    </footer>
  );
}

