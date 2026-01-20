'use client';

import { useState } from 'react';
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

export default function DashboardPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [showResults, setShowResults] = useState(false);

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
            <Card key={match.id} className="flex flex-col">
              <div className="w-full py-4">
                {/* Match Number */}
                <h2 className="text-xl font-bold text-retro-dark text-center mb-4">Match {index + 1}</h2>

                {/* Teams Horizontal Layout */}
                <div className="flex items-center justify-center gap-4">
                  {/* Team 1 */}
                  <div className="flex flex-col items-center space-y-2 flex-1">
                    <img
                      src={match.team1.logo}
                      alt={match.team1.name}
                      className="w-20 h-20 object-contain border-2 border-retro-dark rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Team';
                      }}
                    />
                    <span className="inline-block px-3 py-1.5 bg-retro-accent/10 text-retro-accent font-bold text-sm rounded-full border-2 border-retro-accent text-center">
                      {match.team1.name}
                    </span>
                  </div>

                  {/* V/S Separator */}
                  <div className="flex items-center justify-center">
                    <span className="w-12 h-12 rounded-full bg-retro-dark text-white font-bold text-lg flex items-center justify-center">V/S</span>
                  </div>

                  {/* Team 2 */}
                  <div className="flex flex-col items-center space-y-2 flex-1">
                    <img
                      src={match.team2.logo}
                      alt={match.team2.name}
                      className="w-20 h-20 object-contain border-2 border-retro-dark rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Team';
                      }}
                    />
                    <span className="inline-block px-3 py-1.5 bg-retro-accent/10 text-retro-accent font-bold text-sm rounded-full border-2 border-retro-accent text-center">
                      {match.team2.name}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

