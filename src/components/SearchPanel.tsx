import { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Music,
  Loader2,
  Crown,
  Plus,
  Star,
  Ban,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { QueueSong } from "@/hooks/use-videoke";

interface SearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration?: string;
  embeddable?: boolean;
}

interface Props {
  onAdd: (song: QueueSong, vip: boolean) => Promise<void> | void;
  className?: string;
  scrollHeight?: string;
}

const decodeHtml = (s: string) => {
  if (typeof document === "undefined") return s;
  const ta = document.createElement("textarea");
  ta.innerHTML = s;
  return ta.value;
};

export function SearchPanel({
  onAdd,
  className = "",
  scrollHeight = "h-[560px]",
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [vipMode, setVipMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const q = searchQuery.trim();
    if (!q) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    debounceRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results ?? []);
        setHasSearched(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSearchError(
          err instanceof Error ? err.message : "Hindi makapag-search.",
        );
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleSelect = async (r: SearchResult) => {
    if (r.embeddable === false) {
      toast.error("Bawal i-embed ang video na ito. Pumili ng iba.");
      return;
    }
    const song: QueueSong = {
      videoId: r.videoId,
      title: decodeHtml(r.title),
      artist: decodeHtml(r.channelTitle),
      thumbnail: r.thumbnail,
      duration: r.duration,
    };
    try {
      await onAdd(song, vipMode);
      if (vipMode) {
        toast.success(`VIP! "${song.title}" sa unahan na.`);
      } else {
        toast.success(`"${song.title}" added!`);
      }
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSearchQuery("");
      setResults([]);
      setHasSearched(false);
      setSearchError(null);
    } catch {
      toast.error("Hindi naidagdag — subukan ulit.");
    }
  };

  return (
    <div className={`flex flex-col overflow-hidden ${className}`}>
      <div className="p-4 border-b border-border/50 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Search className="text-secondary w-5 h-5" />
            Hanap Kanta
          </h3>
          <button
            type="button"
            onClick={() => setVipMode((v) => !v)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
              vipMode
                ? "bg-yellow-400 border-yellow-400 text-black"
                : "bg-transparent border-border text-muted-foreground hover:border-yellow-400/40 hover:text-yellow-300"
            }`}
            title="VIP mode: bagong dagdag punta agad sa unahan"
          >
            <Crown className="w-3.5 h-3.5" />
            VIP {vipMode ? "ON" : "OFF"}
          </button>
        </div>
        <div className="relative">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <Input
            placeholder="Anak Freddie Aguilar, My Way..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 bg-black/20 border-border/50 text-base h-12"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-white rounded-md hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {vipMode && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-xs text-yellow-300">
            <Star className="w-3.5 h-3.5 fill-current shrink-0" />
            VIP mode ON — bawat dagdag punta sa unahan ng pila.
          </div>
        )}
      </div>

      <ScrollArea className={scrollHeight}>
        <div className="p-2 flex flex-col gap-1">
          {!searchQuery && (
            <div className="p-10 text-center text-muted-foreground text-sm flex flex-col items-center gap-3">
              <Music className="w-10 h-10 text-muted-foreground/30" />
              <p>Mag-type ng pamagat ng kanta o pangalan ng artist.</p>
              <p className="text-xs text-muted-foreground/70">
                Auto-search sa YouTube — walang API key na kailangan.
              </p>
            </div>
          )}

          {searchError && (
            <div className="p-6 text-center text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg">
              {searchError}
            </div>
          )}

          {searchQuery &&
            !isSearching &&
            hasSearched &&
            !searchError &&
            results.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Walang nahanap. Subukan ulit.
              </div>
            )}

          {results.map((r) => {
            const blocked = r.embeddable === false;
            return (
              <button
                key={r.videoId}
                type="button"
                onClick={() => handleSelect(r)}
                disabled={blocked}
                title={
                  blocked
                    ? "Bawal i-embed ang video na ito"
                    : undefined
                }
                className={`group flex items-center gap-3 p-2 rounded-lg text-left transition-colors w-full border ${
                  blocked
                    ? "opacity-50 cursor-not-allowed border-destructive/30 bg-destructive/5"
                    : "hover:bg-white/5 border-transparent hover:border-white/10 active:scale-[0.99]"
                }`}
              >
                <div className="relative w-24 h-16 shrink-0 rounded overflow-hidden bg-black/40">
                  {r.thumbnail && (
                    <img
                      src={r.thumbnail}
                      alt=""
                      className={`w-full h-full object-cover ${blocked ? "grayscale" : ""}`}
                      loading="lazy"
                    />
                  )}
                  {blocked && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Ban className="w-6 h-6 text-destructive" />
                    </div>
                  )}
                  {r.duration && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                      {r.duration}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`font-bold text-sm truncate ${blocked ? "text-muted-foreground line-through" : "text-white"}`}
                  >
                    {decodeHtml(r.title)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {decodeHtml(r.channelTitle)}
                  </p>
                  {blocked && (
                    <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-destructive/15 text-destructive">
                      <Ban className="w-2.5 h-2.5" />
                      Hindi mai-play
                    </span>
                  )}
                </div>
                {!blocked && (
                  <div
                    className={`shrink-0 p-2 rounded-full transition-all ${
                      vipMode
                        ? "bg-yellow-400/10 text-yellow-300 group-hover:bg-yellow-400 group-hover:text-black"
                        : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    }`}
                  >
                    {vipMode ? (
                      <Crown className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
