import React, { useState, useEffect } from 'react';
import { Search, Play, Disc, Loader2, Music } from 'lucide-react';
import { TrackInfo } from '../types/room';

interface SongSearchEngineProps {
  onSelectTrack: (track: TrackInfo) => void;
  onFileUpload: (file: File) => void;
  canControl: boolean;
}

export const SongSearchEngine: React.FC<SongSearchEngineProps> = ({
  onSelectTrack,
  onFileUpload,
  canControl
}) => {
  const [searchQuery, setSearchQuery] = useState('Blinding Lights');
  const [searchResults, setSearchResults] = useState<TrackInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  // Perform online search using iTunes Music Search API
  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setSearchedOnce(true);

    try {
      const endpoint = `https://itunes.apple.com/search?media=music&entity=song&limit=15&term=${encodeURIComponent(query.trim())}`;
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.results && Array.isArray(data.results)) {
        const tracks: TrackInfo[] = data.results.map((item: any) => {
          // Upgrade artwork resolution from 100x100 to 300x300
          const artwork = item.artworkUrl100
            ? item.artworkUrl100.replace('100x100bb.jpg', '300x300bb.jpg')
            : undefined;

          return {
            id: `online_${item.trackId || Math.random().toString(36).substring(2, 9)}`,
            title: item.trackName || 'Unknown Song',
            artist: item.artistName || 'Unknown Artist',
            album: item.collectionName || 'Single',
            duration: item.trackTimeMillis ? Math.round(item.trackTimeMillis / 1000) : 30,
            url: item.previewUrl,
            coverUrl: artwork
          };
        }).filter((t: TrackInfo) => !!t.url); // keep tracks with valid audio stream URL

        setSearchResults(tracks);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Online song search failed:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Perform initial search on load
  useEffect(() => {
    performSearch('Blinding Lights');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  return (
    <div className="bg-[#11141c] border border-[#1f2433] rounded-2xl p-5 space-y-4 shadow-xl max-w-lg mx-auto">
      
      {/* Title */}
      <div className="border-b border-[#1c212d] pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-[#d4af37]" />
          Online Music Search Engine
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Type any song name or artist to search online and play in sync.
        </p>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type any song name (e.g. Shape of You, Starboy)..."
            className="w-full bg-[#0a0c10] border border-[#1e2333] focus:border-slate-400 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !searchQuery.trim()}
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>SEARCH</span>
        </button>
      </form>

      {/* Search Results */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {loading ? (
          <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
            Searching online music servers...
          </div>
        ) : searchResults.length === 0 && searchedOnce ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No online audio found for "{searchQuery}". Try typing another song or artist name.
          </div>
        ) : (
          searchResults.map((track) => (
            <div
              key={track.id}
              className="p-3 rounded-xl bg-[#0a0c10] border border-[#1c212d] hover:border-[#282f42] flex items-center justify-between transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-[#141824] border border-[#222736] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <Disc className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                <div className="max-w-[200px] sm:max-w-[240px]">
                  <div className="font-bold text-xs text-slate-100 group-hover:text-[#d4af37] transition truncate">
                    {track.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {track.artist} • {track.album}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectTrack(track)}
                disabled={!canControl}
                className="px-3.5 py-2 rounded-xl bg-[#181d29] hover:bg-slate-100 hover:text-slate-950 border border-[#282f42] text-slate-200 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-40"
              >
                <Play className="w-3.5 h-3.5 fill-current text-[#d4af37] group-hover:text-slate-950" />
                PLAY ONLINE
              </button>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
