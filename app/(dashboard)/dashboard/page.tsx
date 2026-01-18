'use client';

import Card from '@/app/components/ui/Card';
import MatchDateField from '@/app/components/ui/MatchDateField';

export default function DashboardPage() {
  const handleFind = (date: string) => {
    console.log('Find date:', date);
    // Handle find logic here
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
      <Card>
        <div className="py-4">
          <MatchDateField onFind={handleFind} />
        </div>
      </Card>
    </div>
  );
}

