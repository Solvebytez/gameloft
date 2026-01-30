'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Select from '@/app/components/ui/Select';
import { useMatch, Match } from '@/app/hooks/useMatches';

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

  // Fetch match data from API
  const { data: matchData, isLoading, error } = useMatch(matchId);

  const [favouriteTeam, setFavouriteTeam] = useState<'team1' | 'team2'>('team1'); // Default to team1
  const [userScope, setUserScope] = useState<'customer' | 'all'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [team1Rate, setTeam1Rate] = useState('');
  const [team1Amount, setTeam1Amount] = useState('');
  const [team2Rate, setTeam2Rate] = useState('');
  const [team2Amount, setTeam2Amount] = useState('');

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
      team1Rate,
      team1Amount,
      team2Rate,
      team2Amount,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-retro-dark">Loading match...</p>
      </div>
    );
  }

  if (error || !matchData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <p className="text-lg text-red-600 font-bold">Match not found</p>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-retro-dark text-white font-bold rounded hover:opacity-90 transition-opacity"
        >
          Go Back
        </button>
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
      </div>

      {/* Two Cards Side by Side - 30% Form, 70% Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[30%_70%] gap-6">
        {/* Entry Window Card - Left Side */}
        <Card>
          <h1 className="text-2xl font-bold text-foreground mb-6">Entry Window</h1>
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  {matchData.team1.logo ? (
                    <Image
                      src={matchData.team1.logo}
                      alt={matchData.team1.name}
                      width={96}
                      height={96}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-retro-dark text-xs font-bold">
                      {matchData.team1.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">{matchData.team1.name.toUpperCase()}</div>
                  <div className="text-white font-semibold text-sm">{matchData.team1.name}</div>
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
                  {matchData.team2.logo ? (
                    <Image
                      src={matchData.team2.logo}
                      alt={matchData.team2.name}
                      width={96}
                      height={96}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-retro-dark text-xs font-bold">
                      {matchData.team2.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <div className="text-white font-bold text-lg">{matchData.team2.name.toUpperCase()}</div>
                  <div className="text-white font-semibold text-sm">{matchData.team2.name}</div>
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

          {/* Rate and Amount Inputs - Two Columns (One per Team) */}
          <div className="space-y-4">
            {/* Section Headers */}
            <div className="grid grid-cols-2 gap-6">
              {/* Team 1 Column Header */}
              <div>
                <h3 className={`text-base font-bold mb-1 whitespace-nowrap ${
                  favouriteTeam === 'team1' ? 'text-green-700' : 'text-red-700'
                }`} style={{ fontSize: '16px' }}>
                  {favouriteTeam === 'team1' ? 'Favourite - Lagai' : 'Non-Favourite - Khai'}
                </h3>
                <p className="text-xs text-retro-dark truncate">{matchData.team1.name}</p>
              </div>
              {/* Team 2 Column Header */}
              <div>
                <h3 className={`text-base font-bold mb-1 whitespace-nowrap ${
                  favouriteTeam === 'team2' ? 'text-green-700' : 'text-red-700'
                }`} style={{ fontSize: '16px' }}>
                  {favouriteTeam === 'team2' ? 'Favourite - Lagai' : 'Non-Favourite - Khai'}
                </h3>
                <p className="text-xs text-retro-dark truncate">{matchData.team2.name}</p>
              </div>
            </div>
            
            {/* Input Fields - Two Columns: Each column has Rate and Amount */}
            <div className="grid grid-cols-2 gap-6">
              {/* Team 1 Column */}
              <div className="space-y-4">
                <Input
                  label="Rate"
                  type="text"
                  placeholder={favouriteTeam === 'team1' ? 'Fav Rate' : 'NFav Rate'}
                  value={team1Rate}
                  onChange={(e) => setTeam1Rate(e.target.value)}
                  className={
                    favouriteTeam === 'team1'
                      ? '!bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600'
                      : '!bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600'
                  }
                />
                <Input
                  label="Amount"
                  type="text"
                  placeholder={favouriteTeam === 'team1' ? 'Fav. Amt.' : 'NFav. Am'}
                  value={team1Amount}
                  onChange={(e) => setTeam1Amount(e.target.value)}
                  className={
                    favouriteTeam === 'team1'
                      ? '!bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600'
                      : '!bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600'
                  }
                />
              </div>
              {/* Team 2 Column */}
              <div className="space-y-4">
                <Input
                  label="Rate"
                  type="text"
                  placeholder={favouriteTeam === 'team2' ? 'Fav Rate' : 'NFav Rate'}
                  value={team2Rate}
                  onChange={(e) => setTeam2Rate(e.target.value)}
                  className={
                    favouriteTeam === 'team2'
                      ? '!bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600'
                      : '!bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600'
                  }
                />
                <Input
                  label="Amount"
                  type="text"
                  placeholder={favouriteTeam === 'team2' ? 'Fav. Amt.' : 'NFav. Am'}
                  value={team2Amount}
                  onChange={(e) => setTeam2Amount(e.target.value)}
                  className={
                    favouriteTeam === 'team2'
                      ? '!bg-green-100 !border-green-600 !border-[3px] focus:!ring-green-500 focus:!border-green-600'
                      : '!bg-red-100 !border-red-600 !border-[3px] focus:!ring-red-500 focus:!border-red-600'
                  }
                />
              </div>
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

        {/* Recent Entries Card - Right Side */}
        <Card>
          <h2 className="text-2xl font-bold text-foreground mb-6">Recent Entries</h2>
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

