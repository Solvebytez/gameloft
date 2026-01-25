'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';

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

interface RecentEntry {
  id: number;
  customer: string;
  team1Fav: string;
  team1Nfav: string;
  team2Fav: string;
  team2Nfav: string;
  createdAt: string;
  updatedAt: string;
}

export default function MatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id;

  const [matchData, setMatchData] = useState<Match | null>(null);
  const [favouriteTeam, setFavouriteTeam] = useState<'team1' | 'team2'>('team1'); // Default to team1
  const [userScope, setUserScope] = useState<'customer' | 'all'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [favRate, setFavRate] = useState('');
  const [favAmount, setFavAmount] = useState('');
  const [nfavRate, setNfavRate] = useState('');
  const [nfavAmount, setNfavAmount] = useState('');

  // Sample recent entries data - In future, this will come from React TanStack Query
  const recentEntries: RecentEntry[] = [
    {
      id: 1,
      customer: '17',
      team1Fav: '71/40000',
      team1Nfav: '0',
      team2Fav: '0',
      team2Nfav: '0/0000',
      createdAt: '2026-01-10 17:09:12',
      updatedAt: '2026-01-10 17:09:57',
    },
    {
      id: 2,
      customer: '15',
      team1Fav: '0/0000',
      team1Nfav: '0',
      team2Fav: '0',
      team2Nfav: '2/500000',
      createdAt: '2026-01-10 16:28:44',
      updatedAt: '2026-01-10 16:28:44',
    },
    {
      id: 3,
      customer: 'PZ',
      team1Fav: '5/1000000',
      team1Nfav: '0',
      team2Fav: '0',
      team2Nfav: '6.5/50000',
      createdAt: '2026-01-10 15:20:30',
      updatedAt: '2026-01-10 15:20:30',
    },
    {
      id: 4,
      customer: 'JK',
      team1Fav: '0/0000',
      team1Nfav: '0',
      team2Fav: '0',
      team2Nfav: '3.5/250000',
      createdAt: '2026-01-10 14:15:22',
      updatedAt: '2026-01-10 14:15:22',
    },
    {
      id: 5,
      customer: '27',
      team1Fav: '0/0000',
      team1Nfav: '0',
      team2Fav: '0',
      team2Nfav: '5.5/200000',
      createdAt: '2026-01-10 13:10:15',
      updatedAt: '2026-01-10 13:10:15',
    },
    {
      id: 6,
      customer: '14',
      team1Fav: '0/0000',
      team1Nfav: '0',
      team2Fav: '0',
      team2Nfav: '5/500000',
      createdAt: '2026-01-10 12:05:08',
      updatedAt: '2026-01-10 12:05:08',
    },
  ];

  // Sample customer options - In future, this will come from API
  const customerOptions = [
    { value: '', label: '--SELECT--' },
    { value: 'customer1', label: 'Customer 1' },
    { value: 'customer2', label: 'Customer 2' },
    { value: 'customer3', label: 'Customer 3' },
  ];

  useEffect(() => {
    // Get match data from sessionStorage or use matchId to fetch
    if (typeof window !== 'undefined') {
      const storedMatches = sessionStorage.getItem('dashboard-matches');
      if (storedMatches) {
        try {
          const matches: Match[] = JSON.parse(storedMatches);
          const match = matches.find((m) => m.id === Number(matchId));
          if (match) {
            setMatchData(match);
          } else {
            // Fallback to sample data if match not found
            setMatchData({
              id: Number(matchId),
              team1: {
                name: 'Melbourne Star',
                logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Melbourne+Star',
              },
              team2: {
                name: 'Melbourne Renegade',
                logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Melbourne+Renegade',
              },
            });
          }
        } catch (error) {
          console.error('Error parsing stored matches:', error);
        }
      } else {
        // Fallback to sample data
        setMatchData({
          id: Number(matchId),
          team1: {
            name: 'Melbourne Star',
            logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Melbourne+Star',
          },
          team2: {
            name: 'Melbourne Renegade',
            logo: 'https://placehold.co/100x100/e8dcc8/2d2d2d?text=Melbourne+Renegade',
          },
        });
      }
    }
  }, [matchId]);

  const handleBack = () => {
    router.back();
  };

  const handleTeamSelect = (team: 'team1' | 'team2') => {
    setFavouriteTeam(team);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission - In future, this will use React TanStack Query
    console.log('Form submitted:', {
      matchId,
      favouriteTeam,
      userScope,
      selectedCustomer,
      favRate,
      favAmount,
      nfavRate,
      nfavAmount,
    });
  };

  if (!matchData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-retro-dark">Loading...</p>
      </div>
    );
  }

  // Teams stay in fixed positions, only colors switch based on which is favourite

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-retro-dark text-white font-bold rounded hover:opacity-90 transition-opacity flex items-center gap-2"
          aria-label="Go back"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
        <h1 className="text-3xl font-bold text-foreground">Entry Window</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="py-6 space-y-6">
          {/* Team Selection Cards - Teams stay in fixed positions, only colors switch */}
          <div className="grid grid-cols-2 gap-4">
            {/* Team 1 Card - Green if favourite, Red if not */}
            <button
              type="button"
              onClick={() => handleTeamSelect('team1')}
              className={`relative p-6 rounded-lg border-4 transition-all ${
                favouriteTeam === 'team1'
                  ? 'bg-green-500 border-green-700 hover:bg-green-600'
                  : 'bg-red-500 border-red-700 hover:bg-red-600'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="text-white font-bold text-sm mb-2">
                  {favouriteTeam === 'team1' ? 'Fav.' : 'NFav.'}
                </div>
                <div className="relative w-24 h-24 border-2 border-white rounded overflow-hidden bg-white">
                  <Image
                    src={matchData.team1.logo}
                    alt={matchData.team1.name}
                    width={96}
                    height={96}
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">STARS</div>
                  <div className="text-white font-semibold">{matchData.team1.name}</div>
                </div>
              </div>
            </button>

            {/* Team 2 Card - Green if favourite, Red if not */}
            <button
              type="button"
              onClick={() => handleTeamSelect('team2')}
              className={`relative p-6 rounded-lg border-4 transition-all ${
                favouriteTeam === 'team2'
                  ? 'bg-green-500 border-green-700 hover:bg-green-600'
                  : 'bg-red-500 border-red-700 hover:bg-red-600'
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <div className="text-white font-bold text-sm mb-2">
                  {favouriteTeam === 'team2' ? 'Fav.' : 'NFav.'}
                </div>
                <div className="relative w-24 h-24 border-2 border-white rounded overflow-hidden bg-white">
                  <Image
                    src={matchData.team2.logo}
                    alt={matchData.team2.name}
                    width={96}
                    height={96}
                    className="object-contain"
                    unoptimized
                  />
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">RENEGADES</div>
                  <div className="text-white font-semibold">{matchData.team2.name}</div>
                </div>
              </div>
            </button>
          </div>

          {/* User Scope Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-retro-dark uppercase mb-2">
              User Scope
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="userScope"
                  value="customer"
                  checked={userScope === 'customer'}
                  onChange={(e) => setUserScope(e.target.value as 'customer' | 'all')}
                  className="w-5 h-5 text-blue-600 border-2 border-retro-dark focus:ring-2 focus:ring-retro-accent"
                />
                <span className="text-retro-dark font-semibold">Customer Wise</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="userScope"
                  value="all"
                  checked={userScope === 'all'}
                  onChange={(e) => setUserScope(e.target.value as 'customer' | 'all')}
                  className="w-5 h-5 text-blue-600 border-2 border-retro-dark focus:ring-2 focus:ring-retro-accent"
                />
                <span className="text-retro-dark font-semibold">All User</span>
              </label>
            </div>
          </div>

          {/* Customer Dropdown - Only show when Customer Wise is selected */}
          {userScope === 'customer' && (
            <div>
              <Select
                label="CUSTOMER"
                options={customerOptions}
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="w-full"
              />
            </div>
          )}

          {/* Rate and Amount Inputs - Single Row */}
          <div className="space-y-4">
            {/* Section Headers */}
            <div className="grid grid-cols-4 gap-6">
              <div>
                <h3 className="text-lg font-bold text-retro-dark mb-4">Favourite - Lagai</h3>
              </div>
              <div></div>
              <div>
                <h3 className="text-lg font-bold text-retro-dark mb-4">Non-Favourite - Khai</h3>
              </div>
              <div></div>
            </div>
            
            {/* Input Fields in Single Row */}
            <div className="grid grid-cols-4 gap-6">
              <Input
                label="Rate"
                type="text"
                placeholder="Fav Rate"
                value={favRate}
                onChange={(e) => setFavRate(e.target.value)}
                className="bg-green-100 border-green-600 border-[3px] focus:ring-green-500"
              />
              <Input
                label="Amount"
                type="text"
                placeholder="Fav. Amt."
                value={favAmount}
                onChange={(e) => setFavAmount(e.target.value)}
                className="bg-green-100 border-green-600 border-[3px] focus:ring-green-500"
              />
              <Input
                label="Rate"
                type="text"
                placeholder="NFav Rate"
                value={nfavRate}
                onChange={(e) => setNfavRate(e.target.value)}
                className="bg-red-100 border-red-600 border-[3px] focus:ring-red-500"
              />
              <Input
                label="Amount"
                type="text"
                placeholder="NFav. Am"
                value={nfavAmount}
                onChange={(e) => setNfavAmount(e.target.value)}
                className="bg-red-100 border-red-600 border-[3px] focus:ring-red-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-500 text-white font-bold text-lg rounded-lg hover:bg-blue-600 transition-colors"
            >
              Submit
            </button>
          </div>
        </form>
      </Card>

      {/* Recent Entries Table */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Recent Entries</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-retro-dark">
                  <th className="px-4 py-3 text-left font-bold text-retro-dark">Customer</th>
                  <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark" colSpan={2}>
                    {matchData.team1.name}
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark" colSpan={2}>
                    {matchData.team2.name}
                  </th>
                  <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark">Action</th>
                  <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark">Created at</th>
                  <th className="px-4 py-3 text-center font-bold text-retro-dark border-l-2 border-retro-dark">Updated at</th>
                </tr>
                <tr className="border-b-2 border-retro-dark">
                  <th></th>
                  <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark">Fav.</th>
                  <th className="px-4 py-2 text-center font-semibold text-retro-dark">NFav.</th>
                  <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark">Fav.</th>
                  <th className="px-4 py-2 text-center font-semibold text-retro-dark">NFav.</th>
                  <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark"></th>
                  <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark"></th>
                  <th className="px-4 py-2 text-center font-semibold text-retro-dark border-l-2 border-retro-dark"></th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-retro-dark/20 hover:bg-retro-cream/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white font-bold text-sm">
                        {entry.customer}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                      <span className="inline-block px-3 py-1 bg-green-500 text-white font-semibold text-sm rounded">
                        {entry.team1Fav}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white font-semibold text-sm">
                        {entry.team1Nfav}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                      <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500 text-white font-semibold text-sm">
                        {entry.team2Fav}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-3 py-1 bg-red-500 text-white font-semibold text-sm rounded">
                        {entry.team2Nfav}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                      <button className="px-4 py-2 bg-blue-500 text-white font-semibold text-sm rounded hover:bg-blue-600 transition-colors">
                        Edit
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                      <span className="inline-block px-3 py-1 bg-gray-400 text-white font-semibold text-sm rounded">
                        {entry.createdAt}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center border-l-2 border-retro-dark">
                      <span className="inline-block px-3 py-1 bg-gray-400 text-white font-semibold text-sm rounded">
                        {entry.updatedAt}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

