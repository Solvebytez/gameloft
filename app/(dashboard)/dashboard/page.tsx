'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Card from '@/app/components/ui/Card';
import MatchDateField from '@/app/components/ui/MatchDateField';
import { useMatchesByDate, Match } from '@/app/hooks/useMatches';

export default function DashboardPage() {
  const [searchDate, setSearchDate] = useState<string | null>(null);
  const { data: matches = [], isLoading } = useMatchesByDate(searchDate);

  const handleFind = (date: string) => {
    setSearchDate(date);
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="py-4">
          <MatchDateField onFind={handleFind} />
        </div>
      </Card>

      {/* Match Results */}
      {searchDate && (
        <>
          {isLoading ? (
            <Card>
              <div className="py-8 text-center">
                <p className="text-lg text-retro-dark">Loading matches...</p>
              </div>
            </Card>
          ) : matches.length > 0 ? (
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
                          <div className="relative w-20 h-20 border-2 border-retro-dark rounded overflow-hidden flex-shrink-0 bg-white">
                            {match.team1.logo ? (
                              <Image
                                src={match.team1.logo}
                                alt={match.team1.name}
                                width={80}
                                height={80}
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-retro-dark text-xs font-bold">
                                {match.team1.name.charAt(0)}
                              </div>
                            )}
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
                          <div className="relative w-20 h-20 border-2 border-retro-dark rounded overflow-hidden flex-shrink-0 bg-white">
                            {match.team2.logo ? (
                              <Image
                                src={match.team2.logo}
                                alt={match.team2.name}
                                width={80}
                                height={80}
                                className="object-contain"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-retro-dark text-xs font-bold">
                                {match.team2.name.charAt(0)}
                              </div>
                            )}
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
          ) : (
            <Card>
              <div className="py-8 text-center">
                <p className="text-lg text-retro-dark">No matches found for the selected date.</p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

