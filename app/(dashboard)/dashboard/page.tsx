'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Card from '@/app/components/ui/Card';
import MatchDateField from '@/app/components/ui/MatchDateField';

interface Match {
  id: number;
  team1: {
    name: string;
    logo: string;
  };
  team2: {
    name: string;
    logo: string;
  };
}

// Helper function to get initial state from sessionStorage
const getInitialMatches = (): Match[] => {
  if (typeof window !== 'undefined') {
    const storedMatches = sessionStorage.getItem('dashboard-matches');
    if (storedMatches) {
      try {
        return JSON.parse(storedMatches);
      } catch (error) {
        console.error('Error parsing stored matches:', error);
      }
    }
  }
  return [];
};

const getInitialShowResults = (): boolean => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('dashboard-show-results') === 'true';
  }
  return false;
};

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>(getInitialMatches);
  const [showResults, setShowResults] = useState<boolean>(getInitialShowResults);

  const handleFind = (date: string) => {
    console.log('Find date:', date);
    
    // Sample match data - In future, this will come from React TanStack Query
    const sampleMatches: Match[] = [
      {
        id: 1,
        team1: {
          name: 'Mumbai',
          logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Mumbai',
        },
        team2: {
          name: 'Delhi',
          logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Delhi',
        },
      },
      {
        id: 2,
        team1: {
          name: 'Melbourne Star',
          logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Melbourne+Star',
        },
        team2: {
          name: 'Melbourne Renegades',
          logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Melbourne+Renegades',
        },
      },
      {
        id: 3,
        team1: {
          name: 'brisbane heat',
          logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Brisbane+Heat',
        },
        team2: {
          name: 'syndy thunder',
          logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Sydney+Thunder',
        },
      },
    ];

    setMatches(sampleMatches);
    setShowResults(true);
    
    // Store results in sessionStorage to persist across navigation
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('dashboard-matches', JSON.stringify(sampleMatches));
      sessionStorage.setItem('dashboard-show-results', 'true');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-[var(--foreground)]">Dashboard</h1>
      <Card>
        <div className="py-4">
          <MatchDateField onFind={handleFind} />
        </div>
      </Card>

      {/* Match Results */}
      {showResults && matches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {matches.map((match, index) => (
            <Link key={match.id} href={`/match/${match.id}`} className="block h-full">
              <Card className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="w-full py-4 flex flex-col flex-1">
                  {/* Match Number */}
                  <h2 className="text-xl font-bold text-retro-dark text-center mb-4">Match {index + 1}</h2>

                  {/* Teams Horizontal Layout */}
                  <div className="flex items-center justify-center gap-4 flex-1">
                    {/* Team 1 */}
                    <div className="flex flex-col items-center space-y-2 flex-1 min-w-0">
                      <div className="relative w-20 h-20 border-2 border-retro-dark rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={match.team1.logo}
                          alt={match.team1.name}
                          width={80}
                          height={80}
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <span className="inline-block px-3 py-1.5 bg-retro-accent/10 text-retro-accent font-bold text-sm rounded-full border-2 border-retro-accent text-center w-full">
                        {match.team1.name}
                      </span>
                    </div>

                    {/* V/S Separator */}
                    <div className="flex items-center justify-center flex-shrink-0">
                      <span className="w-12 h-12 rounded-full bg-retro-dark text-white font-bold text-lg flex items-center justify-center">V/S</span>
                    </div>

                    {/* Team 2 */}
                    <div className="flex flex-col items-center space-y-2 flex-1 min-w-0">
                      <div className="relative w-20 h-20 border-2 border-retro-dark rounded overflow-hidden flex-shrink-0">
                        <Image
                          src={match.team2.logo}
                          alt={match.team2.name}
                          width={80}
                          height={80}
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      <span className="inline-block px-3 py-1.5 bg-retro-accent/10 text-retro-accent font-bold text-sm rounded-full border-2 border-retro-accent text-center w-full">
                        {match.team2.name}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

