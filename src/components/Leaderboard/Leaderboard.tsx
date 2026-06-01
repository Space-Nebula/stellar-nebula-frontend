import React, { useState, useEffect } from 'react';

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  walletAddress: string;
  resourcesCollected: number;
  shipsUpgraded: number;
  achievementsUnlocked: number;
}

// Mock data generator
const generateMockData = (): LeaderboardEntry[] => {
  return Array.from({ length: 50 }, (_, i) => ({
    rank: i + 1,
    playerId: `player_${Math.random().toString(36).substr(2, 9)}`,
    walletAddress: `G${Math.random().toString(36).substr(2, 5).toUpperCase()}...${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    resourcesCollected: Math.floor(Math.random() * 1000000),
    shipsUpgraded: Math.floor(Math.random() * 50),
    achievementsUnlocked: Math.floor(Math.random() * 100),
  }));
};

const ITEMS_PER_PAGE = 10;
const CURRENT_USER_ID = 'player_current123'; // Mock current user ID for highlighting

export const Leaderboard: React.FC = () => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const fetchData = async () => {
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      const mockData = generateMockData();
      
      // Inject current user for highlighting demonstration
      mockData[12] = {
        ...mockData[12],
        playerId: CURRENT_USER_ID,
        walletAddress: 'GUSER...1234',
      };
      
      setData(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch leaderboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginatedData = data.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  if (loading && data.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-nebula-core"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-space-800 border border-red-500 rounded-lg text-red-400 text-center">
        <p>{error}</p>
        <button 
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-space-700 hover:bg-space-600 rounded transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center p-8 bg-space-900 rounded-lg border border-space-700">
        <p className="text-space-100">No explorers found on the leaderboard yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-space-900 rounded-xl border border-space-700 overflow-hidden shadow-nebula-glow transition-all duration-300">
      <div className="p-6 border-b border-space-700">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-nebula-core to-cosmic-cyan">
          Galactic Leaderboard
        </h2>
        <p className="text-space-100 mt-2">Top explorers across the nebula.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-space-800 text-space-100 text-sm uppercase tracking-wider">
              <th className="p-4 font-semibold">Rank</th>
              <th className="p-4 font-semibold">Explorer</th>
              <th className="p-4 font-semibold">Wallet</th>
              <th className="p-4 font-semibold text-right">Resources</th>
              <th className="p-4 font-semibold text-right">Ships</th>
              <th className="p-4 font-semibold text-right">Achievements</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-space-800 text-space-100">
            {paginatedData.map((entry) => (
              <tr 
                key={entry.playerId} 
                className={`hover:bg-space-800 transition-colors ${entry.playerId === CURRENT_USER_ID ? 'bg-space-800/80 border-l-4 border-nebula-core' : ''}`}
              >
                <td className="p-4 font-medium flex items-center gap-2">
                  {entry.rank <= 3 ? (
                    <span className={`flex justify-center items-center w-6 h-6 rounded-full text-xs font-bold ${
                      entry.rank === 1 ? 'bg-yellow-500 text-yellow-900' : 
                      entry.rank === 2 ? 'bg-gray-300 text-gray-800' : 
                      'bg-yellow-700 text-yellow-100'
                    }`}>
                      {entry.rank}
                    </span>
                  ) : (
                    <span className="text-space-100 ml-2">{entry.rank}</span>
                  )}
                </td>
                <td className="p-4 font-medium text-cosmic-cyan">{entry.playerId === CURRENT_USER_ID ? 'You' : entry.playerId}</td>
                <td className="p-4 text-sm text-space-100 font-mono">{entry.walletAddress}</td>
                <td className="p-4 text-right">{entry.resourcesCollected.toLocaleString()}</td>
                <td className="p-4 text-right">{entry.shipsUpgraded}</td>
                <td className="p-4 text-right text-cosmic-purple">{entry.achievementsUnlocked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-space-800/50 border-t border-space-700 flex justify-between items-center text-sm text-space-100">
        <span>Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, data.length)} of {data.length} explorers</span>
        <div className="flex gap-2">
          <button 
            onClick={handlePrevPage} 
            disabled={currentPage === 1}
            className="px-3 py-1 rounded bg-space-700 disabled:opacity-50 hover:bg-space-600 transition-colors"
          >
            Previous
          </button>
          <button 
            onClick={handleNextPage} 
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded bg-space-700 disabled:opacity-50 hover:bg-space-600 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
