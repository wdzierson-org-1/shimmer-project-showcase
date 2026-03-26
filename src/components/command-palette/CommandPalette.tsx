import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ArrowRight, X, Command } from 'lucide-react';
import { processUserMessage } from '@/services/chatService';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

interface SearchResult {
  type: 'project' | 'answer';
  id?: string;
  title?: string;
  client?: string;
  content?: string;
}

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<SearchResult[]>([]);
  const [vpOffset, setVpOffset] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isProjectDetail = location.pathname.startsWith('/project/');
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, title, client')
        .eq('visible', true)
        .order('created_at', { ascending: false });

      if (data) {
        setProjects(
          data.map((p) => ({
            type: 'project' as const,
            id: p.id,
            title: p.title,
            client: p.client,
          }))
        );
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handleOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-search', handleOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-search', handleOpen);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) { setVpOffset(0); return; }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setVpOffset(window.innerHeight - vv.height - vv.offsetTop);
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); };
  }, [isOpen]);

  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      const lowerQuery = searchQuery.toLowerCase();
      const filtered = projects.filter(
        (p) =>
          p.title?.toLowerCase().includes(lowerQuery) ||
          p.client?.toLowerCase().includes(lowerQuery)
      );
      setResults(filtered.slice(0, 5));
    },
    [projects]
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    handleSearch(value);
  };

  const handleAsk = async () => {
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setResults([]);

    try {
      const response = await processUserMessage(query);

      if (response.projects && response.projects.length > 0) {
        setResults(
          response.projects.slice(0, 5).map((p) => ({
            type: 'project' as const,
            id: p.id,
            title: p.title,
            client: p.client,
          }))
        );
      }

      if (response.content) {
        setResults((prev) => [
          { type: 'answer' as const, content: response.content },
          ...prev,
        ]);
      }
    } catch (err) {
      setResults([
        {
          type: 'answer' as const,
          content: "Sorry, I couldn't process that. Try again?",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAsk();
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'project' && result.id) {
      navigate(`/project/${result.id}`);
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Trigger hint — hidden on mobile and project detail pages */}
      <button
        onClick={() => setIsOpen(true)}
        className={`${isProjectDetail ? 'hidden' : 'hidden sm:flex'} fixed bottom-6 right-6 z-40 items-center gap-1.5 px-3 py-2 rounded-full bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 transition-all text-foreground/40 hover:text-foreground/60 backdrop-blur-sm`}
      >
        <Command size={13} />
        <span className="text-xs font-mono">K</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Palette */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-4 sm:top-[20%] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl"
              style={{ transform: `translateX(-50%) translateY(${-vpOffset}px)` }}
            >
              <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl overflow-hidden">
                {/* Input */}
                <form onSubmit={handleSubmit} className="flex items-center px-4 border-b border-border/30">
                  <Search size={16} className="text-muted-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Search projects or ask a question..."
                    className="flex-1 px-3 py-4 bg-transparent text-sm font-sans text-foreground placeholder:text-muted-foreground/50 outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setResults([]);
                        inputRef.current?.focus();
                      }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </form>

                {/* Results */}
                <div className="max-h-48 sm:max-h-80 overflow-y-auto">
                  {isLoading && (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                      <div className="w-3 h-3 border border-foreground/20 border-t-foreground/60 rounded-full animate-spin" />
                      Thinking...
                    </div>
                  )}

                  {results.map((result, i) => {
                    if (result.type === 'answer') {
                      return (
                        <div
                          key={`answer-${i}`}
                          className="px-4 py-3 border-b border-border/20"
                        >
                          <div className="text-sm text-foreground/80 font-sans font-light leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown>{result.content || ''}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={result.id || i}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
                      >
                        <div>
                          <p className="text-sm font-sans text-foreground">
                            {result.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {result.client}
                          </p>
                        </div>
                        <ArrowRight
                          size={14}
                          className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors"
                        />
                      </button>
                    );
                  })}

                  {!isLoading && results.length === 0 && query && (
                    <div className="px-4 py-3 text-sm text-muted-foreground/60">
                      Press Enter to ask about "{query}"
                    </div>
                  )}

                  {!query && (
                    <div className="px-4 py-3 text-xs text-muted-foreground/40">
                      Type to search projects, or ask a question about Will's work
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-border/20 text-[10px] text-muted-foreground/30">
                  <span className="hidden sm:inline">
                    <kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 font-mono">
                      Enter
                    </kbd>{' '}
                    to ask
                  </span>
                  <button
                    className="sm:hidden text-xs text-muted-foreground/60 py-1 px-2 rounded hover:bg-muted/50 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Close
                  </button>
                  <span className="hidden sm:inline">
                    <kbd className="px-1 py-0.5 rounded bg-muted/50 border border-border/30 font-mono">
                      Esc
                    </kbd>{' '}
                    to close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CommandPalette;
