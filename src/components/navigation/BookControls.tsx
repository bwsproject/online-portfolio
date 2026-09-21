import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  List,
  Home,
  ShieldCheck,
  Bookmark,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PortfolioPage } from '../../types';

interface BookControlsProps {
  currentPage: number;
  totalPages: number;
  bookOpen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoToPage: (page: number) => void;
  onToggleBook: (open: boolean) => void;
  onOpenContents: () => void;
  onOpenAdmin: () => void;
  isAdminLoggedIn?: boolean;
  pages?: PortfolioPage[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
}

export const BookControls: React.FC<BookControlsProps> = ({
  currentPage,
  totalPages,
  bookOpen,
  onPrev,
  onNext,
  onGoToPage,
  onToggleBook,
  onOpenContents,
  onOpenAdmin,
  isAdminLoggedIn = false,
  pages = [],
  soundEnabled = true,
  onToggleSound,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSectionSelector, setShowSectionSelector] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCurrentSectionTitle = () => {
    if (!pages || pages.length === 0) return 'SECTION';
    if (!isDesktop || currentPage === 1) {
      return pages[currentPage - 1]?.title || 'SECTION';
    }
    const spreadIndex = Math.floor(currentPage / 2);
    const leftIndex = spreadIndex * 2 - 1;
    const rightIndex = leftIndex + 1;
    const leftTitle = pages[leftIndex]?.title;
    const rightTitle = pages[rightIndex]?.title;

    if (leftTitle && rightTitle && leftTitle !== rightTitle) {
      return `${leftTitle} • ${rightTitle}`;
    }
    return leftTitle || rightTitle || pages[currentPage - 1]?.title || 'SECTION';
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {
        // Fullscreen API may be blocked in iframe
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      id="book-navigation-bar"
      className="fixed bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-[#10121a]/95 backdrop-blur-md border border-[#2b3040]/90 shadow-[0_10px_30px_rgba(0,0,0,0.85)] text-slate-200"
    >
      {/* Cover / Home Button */}
      <button
        id="nav-btn-cover"
        onClick={() => onToggleBook(false)}
        title="Kembali ke Cover"
        className="p-1.5 rounded-full hover:bg-[#1f2433] hover:text-[#c5a059] transition-colors cursor-pointer"
      >
        <Home className="w-3.5 h-3.5" />
      </button>

      <div className="w-[1px] h-3.5 bg-[#282d3d]" />

      {/* Contents / Table of Contents */}
      <button
        id="nav-btn-contents"
        onClick={onOpenContents}
        title="Daftar Isi"
        className="px-2 py-1 rounded-full hover:bg-[#1f2433] hover:text-[#c5a059] transition-colors cursor-pointer text-[11px] font-mono-code flex items-center gap-1"
      >
        <List className="w-3 h-3 text-[#c5a059]" />
        <span className="hidden sm:inline">SECTIONS</span>
      </button>

      {/* If book is open, show navigation controls */}
      {bookOpen && (
        <>
          <div className="w-[1px] h-3.5 bg-[#282d3d]" />

          {/* Previous Section */}
          <button
            id="nav-btn-prev"
            onClick={onPrev}
            title="Sebelumnya (Panah Kiri)"
            className="p-1 sm:p-1.5 rounded-full hover:bg-[#1f2433] hover:text-[#c5a059] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Active Section Indicator & Quick Selector */}
          <div className="relative">
            <button
              id="nav-btn-section-indicator"
              onClick={() => setShowSectionSelector(!showSectionSelector)}
              title="Pilih Bagian"
              className="px-2 sm:px-2.5 py-0.5 rounded-md bg-[#161924] border border-[#282e3f] text-[10px] sm:text-[11px] font-mono-code hover:border-[#c5a059] transition-colors flex items-center gap-1 max-w-[110px] sm:max-w-[200px]"
            >
              <Bookmark className="w-2.5 h-2.5 text-[#c5a059] shrink-0" />
              <span className="text-[#c5a059] font-bold uppercase truncate">{getCurrentSectionTitle()}</span>
            </button>

            {/* Quick Section Jump Dropdown */}
            {showSectionSelector && (
              <div
                id="nav-section-selector-menu"
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 sm:w-52 max-h-56 overflow-y-auto rounded-xl bg-[#141722] border border-[#2c3245] shadow-2xl p-1 z-50 text-xs font-mono-code"
              >
                <div className="px-2 py-1 text-[10px] text-slate-400 uppercase tracking-wider border-b border-[#252b3b] mb-1">
                  PILIH BAGIAN:
                </div>
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onGoToPage(p.pageNumber);
                      setShowSectionSelector(false);
                    }}
                    className={`w-full text-left px-2 py-1 rounded-lg flex items-center justify-between hover:bg-[#202536] transition-colors ${
                      p.pageNumber === currentPage
                        ? 'bg-[#c5a059]/20 text-[#c5a059] font-bold'
                        : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{p.title}</span>
                    {p.pageNumber === currentPage && <span className="text-[10px]">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Next Section */}
          <button
            id="nav-btn-next"
            onClick={onNext}
            title="Berikutnya (Panah Kanan)"
            className="p-1 sm:p-1.5 rounded-full hover:bg-[#1f2433] hover:text-[#c5a059] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      <div className="w-[1px] h-3.5 bg-[#282d3d]" />

      {/* Audio Sound Toggle */}
      {onToggleSound && (
        <button
          id="nav-btn-audio"
          onClick={onToggleSound}
          title={soundEnabled ? 'Matikan Suara Kertas' : 'Nyalakan Suara Kertas'}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            soundEnabled
              ? 'text-[#c5a059] hover:bg-[#1f2433]'
              : 'text-slate-500 hover:text-white hover:bg-[#1f2433]'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Fullscreen Toggle */}
      <button
        id="nav-btn-fullscreen"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        className="p-1.5 rounded-full hover:bg-[#1f2433] hover:text-[#c5a059] transition-colors cursor-pointer"
      >
        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>

      {/* Admin Quick Launch Button */}
      <button
        id="nav-btn-admin"
        onClick={onOpenAdmin}
        title="Admin Portal"
        className={`p-1.5 rounded-full transition-colors cursor-pointer ${
          isAdminLoggedIn
            ? 'bg-[#c5a059]/20 text-[#c5a059] hover:bg-[#c5a059]/30'
            : 'hover:bg-[#1f2433] text-slate-400 hover:text-white'
        }`}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
