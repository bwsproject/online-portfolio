import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PortfolioPage,
  PortfolioProject,
  PortfolioService,
  PortfolioSettings,
  CaseStudyItem,
} from '../../types';
import { PageRenderer } from './PageRenderer';
import { Sparkles, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

interface BookEngineProps {
  pages: PortfolioPage[];
  projects: PortfolioProject[];
  services: PortfolioService[];
  settings: PortfolioSettings;
  caseStudies?: CaseStudyItem[];
  currentPage: number; // 1-based page number or 0 for cover
  onPageChange: (newPage: number) => void;
  bookOpen: boolean;
  onToggleBook: (open: boolean) => void;
  onOpenProject: (project: PortfolioProject) => void;
  onOpenGallery: (images: string[], initialIndex?: number) => void;
}

export const BookEngine: React.FC<BookEngineProps> = ({
  pages,
  projects,
  services,
  settings,
  caseStudies,
  currentPage,
  onPageChange,
  bookOpen,
  onToggleBook,
  onOpenProject,
  onOpenGallery,
}) => {
  const visiblePages = pages.filter((p) => p.visible);
  const totalPages = visiblePages.length;

  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [turnDirection, setTurnDirection] = useState<'next' | 'prev' | null>(null);
  const [turnProgress, setTurnProgress] = useState<number>(0); // 0 to 180 deg
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; direction: 'next' | 'prev' | null }>({
    x: 0,
    y: 0,
    direction: null,
  });

  // Check responsive viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop spread calculation:
  // When bookOpen is true:
  // Spread 0: Left: Inside Cover, Right: Page 1
  // Spread 1: Left: Page 2, Right: Page 3
  // Spread 2: Left: Page 4, Right: Page 5
  // Spread 3: Left: Page 6, Right: Page 7
  // Spread 4: Left: Page 8, Right: Page 9
  // Spread 5: Left: Page 10, Right: Page 11
  // Spread 6: Left: Page 12, Right: Page 13
  // Spread 7: Left: Page 14, Right: Back Cover
  const currentSpread = isMobile
    ? Math.max(1, Math.min(currentPage, totalPages))
    : Math.floor(currentPage / 2);

  const maxSpread = isMobile
    ? totalPages
    : Math.ceil(totalPages / 2);

  // Turn to next page/spread
  const nextPage = useCallback(() => {
    if (isAnimating) return;
    if (isMobile) {
      if (currentPage < totalPages) {
        setIsAnimating(true);
        setTurnDirection('next');
        setTimeout(() => {
          onPageChange(currentPage + 1);
          setIsAnimating(false);
          setTurnDirection(null);
        }, 620);
      }
    } else {
      if (currentSpread < maxSpread) {
        setIsAnimating(true);
        setTurnDirection('next');
        setTimeout(() => {
          const nextTargetPage = (currentSpread + 1) * 2;
          onPageChange(Math.min(nextTargetPage, totalPages));
          setIsAnimating(false);
          setTurnDirection(null);
        }, 620);
      }
    }
  }, [isAnimating, isMobile, currentPage, totalPages, currentSpread, maxSpread, onPageChange]);

  // Turn to previous page/spread
  const prevPage = useCallback(() => {
    if (isAnimating) return;
    if (isMobile) {
      if (currentPage > 1) {
        setIsAnimating(true);
        setTurnDirection('prev');
        setTimeout(() => {
          onPageChange(currentPage - 1);
          setIsAnimating(false);
          setTurnDirection(null);
        }, 620);
      } else {
        // Go back to cover
        onToggleBook(false);
      }
    } else {
      if (currentSpread > 0) {
        setIsAnimating(true);
        setTurnDirection('prev');
        setTimeout(() => {
          const prevTargetPage = currentSpread - 1 === 0 ? 1 : (currentSpread - 1) * 2;
          onPageChange(prevTargetPage);
          setIsAnimating(false);
          setTurnDirection(null);
        }, 620);
      } else {
        // Return to cover
        onToggleBook(false);
      }
    }
  }, [isAnimating, isMobile, currentPage, currentSpread, onPageChange, onToggleBook]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!bookOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'Escape') {
        onToggleBook(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bookOpen, nextPage, prevPage, onToggleBook]);

  // Trackpad & Mouse Wheel Scroll Handling (Left/Right & Up/Down scroll to turn pages)
  const lastWheelTime = useRef<number>(0);
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!bookOpen || isAnimating) return;
      // Skip if scrolling inside modals
      const target = e.target as HTMLElement | null;
      if (target?.closest?.('#admin-dashboard-container, #toc-modal-container, #lightbox-modal-backdrop, #project-detail-container, textarea, input')) {
        return;
      }

      const now = Date.now();
      if (now - lastWheelTime.current < 450) return; // cooldown to prevent rapid multi-triggers

      // Horizontal trackpad gesture or mouse scroll (left/right)
      if (Math.abs(e.deltaX) > 20) {
        if (e.deltaX > 20) {
          lastWheelTime.current = now;
          nextPage();
        } else if (e.deltaX < -20) {
          lastWheelTime.current = now;
          prevPage();
        }
      } else if (Math.abs(e.deltaY) > 40) {
        // Vertical mouse wheel scroll (down -> next page, up -> prev page)
        if (e.deltaY > 40) {
          lastWheelTime.current = now;
          nextPage();
        } else if (e.deltaY < -40) {
          lastWheelTime.current = now;
          prevPage();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [bookOpen, isAnimating, nextPage, prevPage]);

  // Mouse drag handling (Tactile physical simulation on page edges)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!bookOpen || isAnimating) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select')) {
      return; // Do not intercept interactive controls
    }

    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const clickX = e.clientX - bounds.left;
    const width = bounds.width;

    // Detect if initiating a flip from right side or left side
    let direction: 'next' | 'prev' | null = null;
    if (clickX > width * 0.7) {
      direction = 'next';
    } else if (clickX < width * 0.3) {
      direction = 'prev';
    }

    if (direction) {
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        direction,
      };
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current.direction) return;

    const deltaX = e.clientX - dragStartRef.current.x;
    const direction = dragStartRef.current.direction;

    if (direction === 'next') {
      const progress = Math.max(0, Math.min(180, (-deltaX / 220) * 180));
      setTurnDirection('next');
      setTurnProgress(progress);
    } else if (direction === 'prev') {
      const progress = Math.max(0, Math.min(180, (deltaX / 220) * 180));
      setTurnDirection('prev');
      setTurnProgress(progress);
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const direction = dragStartRef.current.direction;
    dragStartRef.current.direction = null;

    if (turnProgress > 35) {
      if (direction === 'next') {
        nextPage();
      } else if (direction === 'prev') {
        prevPage();
      }
    } else {
      setTurnProgress(0);
      setTurnDirection(null);
    }
  };

  // Touch Swipe for Mobile & Tablets
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!bookOpen) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!bookOpen || isAnimating) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

    // Horizontal swipe threshold: 30px
    if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY) * 0.7) {
      if (deltaX < 0) {
        nextPage();
      } else {
        prevPage();
      }
    }
  };

  // Pages currently displayed in desktop spread
  const leftPageNum = currentSpread === 0 ? 0 : currentSpread * 2;
  const rightPageNum = currentSpread === 0 ? 1 : currentSpread * 2 + 1;

  const leftPage = leftPageNum > 0 ? visiblePages.find((p) => p.pageNumber === leftPageNum) : null;
  const rightPage = rightPageNum <= totalPages ? visiblePages.find((p) => p.pageNumber === rightPageNum) : null;

  // Pages underneath during animation:
  // When flipping NEXT: reveal the upcoming right page on the right side
  const upcomingRightPageNum = (currentSpread + 1) * 2 + 1;
  const upcomingRightPage =
    upcomingRightPageNum <= totalPages
      ? visiblePages.find((p) => p.pageNumber === upcomingRightPageNum)
      : null;

  // When flipping PREV: reveal the upcoming left page on the left side
  const upcomingLeftPageNum = currentSpread - 1 === 0 ? 0 : (currentSpread - 1) * 2;
  const upcomingLeftPage =
    upcomingLeftPageNum > 0
      ? visiblePages.find((p) => p.pageNumber === upcomingLeftPageNum)
      : null;

  const displayLeftIsCover =
    isAnimating && turnDirection === 'prev'
      ? currentSpread - 1 === 0
      : currentSpread === 0;

  const displayLeftPage =
    isAnimating && turnDirection === 'prev' ? upcomingLeftPage : leftPage;

  const displayRightPage =
    isAnimating && turnDirection === 'next' ? upcomingRightPage : rightPage;

  // Pages on the turning 3D leaf:
  // When flipping NEXT:
  // - front face (starts on right at 0deg): current rightPage
  // - back face (lands on left at -180deg): the upcoming left page
  const upcomingLeftForNext = visiblePages.find(
    (p) => p.pageNumber === (currentSpread + 1) * 2
  );
  // When flipping PREV:
  // - front face (lands on right at 0deg): the upcoming right page
  // - back face (starts on left at -180deg): current leftPage
  const upcomingRightForPrev =
    currentSpread - 1 === 0
      ? visiblePages[0]
      : visiblePages.find((p) => p.pageNumber === (currentSpread - 1) * 2 + 1);

  const turningFrontPage =
    turnDirection === 'next' ? rightPage : upcomingRightForPrev;
  const turningBackPage =
    turnDirection === 'next' ? upcomingLeftForNext : leftPage;

  // --- 3D COVER VIEW (WHEN BOOK IS CLOSED) ---
  if (!bookOpen) {
    return (
      <div className="w-full flex items-center justify-center py-6 sm:py-12 perspective-book">
        {/* Book Container with 3D Depth */}
        <div
          id="book-cover-container"
          className="relative w-[340px] sm:w-[460px] h-[520px] sm:h-[650px] transition-all duration-700 preserve-3d group cursor-pointer"
          style={{
            transform: 'rotateY(-8deg) rotateX(4deg)',
            transformOrigin: 'left center',
          }}
          onClick={() => onToggleBook(true)}
        >
          {/* Subtle Outer Drop Shadow */}
          <div className="absolute inset-0 bg-black/60 rounded-r-2xl filter blur-2xl transform translate-x-8 translate-y-8 pointer-events-none" />

          {/* Book Spine (Left Thickness) */}
          <div
            className="absolute left-0 top-0 bottom-0 w-8 sm:w-10 bg-gradient-to-r from-[#0d0e12] via-[#1a1d24] to-[#0d0e12] rounded-l-md border-y border-l border-[#2e3342] shadow-2xl"
            style={{
              transform: 'rotateY(-90deg) translateZ(0px)',
              transformOrigin: 'left center',
            }}
          >
            <div className="h-full flex items-center justify-center">
              <span className="text-[10px] font-serif-luxury tracking-[0.4em] text-[#c5a059] rotate-90 whitespace-nowrap opacity-75 uppercase">
                BERLY • PORTFOLIO
              </span>
            </div>
          </div>

          {/* Front Hardcover Leaf */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#12141a] via-[#161922] to-[#0c0d12] rounded-r-2xl border border-[#2b3040] shadow-[0_25px_50px_rgba(0,0,0,0.85)] p-6 sm:p-9 flex flex-col justify-between overflow-hidden preserve-3d">
            {/* Gold Leaf Foil Embossing Border */}
            <div className="absolute inset-4 sm:inset-6 border border-[#c5a059]/25 rounded-xl pointer-events-none" />
            <div className="absolute inset-5 sm:inset-7 border border-[#c5a059]/10 rounded-lg pointer-events-none" />

            {/* Corner Filigree / Metallic Accents */}
            <div className="absolute top-6 left-6 w-3 h-3 border-t-2 border-l-2 border-[#c5a059]/50" />
            <div className="absolute top-6 right-6 w-3 h-3 border-t-2 border-r-2 border-[#c5a059]/50" />
            <div className="absolute bottom-6 left-6 w-3 h-3 border-b-2 border-l-2 border-[#c5a059]/50" />
            <div className="absolute bottom-6 right-6 w-3 h-3 border-b-2 border-r-2 border-[#c5a059]/50" />

            {/* Header / Top insignia */}
            <div className="text-center relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1e2330]/80 border border-[#c5a059]/30 text-[#c5a059] text-[11px] font-mono-code uppercase tracking-widest shadow-inner">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{settings.coverEditionText || 'HARDCOVER VOLUME • ED. 2026'}</span>
              </div>
            </div>

            {/* Title & Logo Block */}
            <div className="text-center space-y-3 relative z-10 my-auto">
              {/* Square Logo Box - Prominent & Enlarged */}
              {settings.coverLogo ? (
                <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44 mx-auto rounded-2xl sm:rounded-3xl bg-[#171b26]/95 border-2 border-[#c5a059]/80 p-2 sm:p-2.5 shadow-[0_12px_35px_rgba(197,160,89,0.35)] flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105">
                  <img
                    src={settings.coverLogo}
                    alt="Logo"
                    className="w-full h-full object-contain rounded-xl sm:rounded-2xl"
                  />
                </div>
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 mx-auto rounded-2xl sm:rounded-3xl bg-[#161a24] border-2 border-[#c5a059]/60 p-2.5 shadow-[0_10px_30px_rgba(197,160,89,0.25)] flex items-center justify-center">
                  <span className="font-serif-luxury text-4xl sm:text-5xl text-[#c5a059] font-bold">
                    {(settings.name || 'B').charAt(0)}
                  </span>
                </div>
              )}

              <div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-widest text-white font-serif-luxury gold-gradient-text drop-shadow-md uppercase">
                  {settings.name || 'BERLY'}
                </h1>
                <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#c5a059] to-transparent mx-auto mt-1.5" />
              </div>

              <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-slate-200 font-mono-code">
                {settings.coverTagline || settings.tagline || 'DIGITAL PORTFOLIO'}
              </p>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono-code max-w-xs mx-auto leading-relaxed pt-0.5">
                {settings.coverDescription || settings.bio || 'Interactive Web • Digital Solution • Creative Technology'}
              </p>
            </div>

            {/* Action CTA Button */}
            <div className="text-center relative z-10">
              <button
                id="open-portfolio-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBook(true);
                }}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#c5a059] via-[#e2c889] to-[#c5a059] hover:opacity-95 text-black font-bold tracking-[0.2em] text-xs font-mono-code shadow-[0_10px_25px_rgba(197,160,89,0.25)] transition-all transform hover:scale-[1.02] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>[ OPEN PORTFOLIO ]</span>
              </button>
              <div className="text-[10px] font-mono-code text-slate-400 mt-2.5">
                Click cover or press button to enter 3D volume
              </div>
            </div>

            {/* Subtle Surface Texture / Light Reflection */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.02] to-white/[0.07] pointer-events-none" />
          </div>
        </div>
      </div>
    );
  }

  // --- 3D BOOK OPEN VIEW (DUAL SPREAD / SINGLE PAGE) ---
  return (
    <div
      ref={containerRef}
      id="book-main-viewport"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="w-full flex items-center justify-center py-2 sm:py-4 perspective-book select-none"
    >
      {/* Outer Book Binder Frame */}
      <div
        className={`relative w-full max-w-[1100px] h-[76vh] min-h-[500px] max-h-[680px] bg-[#0c0d12] rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.9)] border border-[#222736] flex ${
          isMobile ? 'flex-col justify-center px-1' : 'flex-row'
        } preserve-3d overflow-visible`}
      >
        {/* DESKTOP TWO-PAGE SPREAD */}
        {!isMobile ? (
          <>
            {/* LEFT SPREAD PAGE */}
            <div
              id="book-left-page"
              className="relative flex-1 h-full bg-[#13161f] rounded-l-xl border-r border-[#1a1d26] overflow-hidden shadow-inner flex flex-col justify-between"
            >
              {/* Paper Crease / Ambient Spine Occlusion (Left) */}
              <div className="absolute top-0 right-0 bottom-0 w-16 book-spine-shadow-right pointer-events-none z-20" />

              {/* Page Content */}
              <div className="relative z-10 h-full overflow-hidden">
                {displayLeftIsCover ? (
                  /* Inside Front Cover */
                  <div className="h-full flex flex-col justify-between p-4 sm:p-6 text-[#94a3b8] bg-[#0d0f15] overflow-y-auto">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono-code tracking-[0.3em] text-[#c5a059] uppercase font-bold">
                          {settings.folioTagline || 'EXECUTIVE FOLIO'}
                        </span>
                        <span className="text-[9px] font-mono-code px-2 py-0.5 rounded-full bg-[#181d2a] text-[#c5a059] border border-[#c5a059]/30">
                          VOL. 2026
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold text-white font-serif-luxury tracking-wide">
                        {settings.folioTitle || settings.name || 'BERLY'}
                      </h3>

                      <p className="text-xs text-slate-300 font-mono-code leading-relaxed">
                        {settings.folioDescription ||
                          'Koleksi karya pilihan yang menggabungkan pengembangan potensi manusia, teknologi, solusi digital, dan data.'}
                      </p>

                      {/* Folio Metadata List */}
                      <div className="pt-3 border-t border-[#222838] space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-mono-code text-[11px]">{settings.folioCuratedLabel || 'Fokus Utama :'}</span>
                          <span className="text-white font-mono-code text-[11.5px] font-semibold">{settings.folioCuratedValue || 'Manusia • Teknologi • Data'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-mono-code text-[11px]">{settings.folioDbLabel || 'Ketertarikan Spesial :'}</span>
                          <span className="text-[#c5a059] font-mono-code text-[11px] font-semibold text-right max-w-[210px]">{settings.folioDbValue || 'Tentang Potensi (Personal) & Membantu Bisnis'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-mono-code text-[11px]">{settings.folioYearsLabel || 'Professional Experience :'}</span>
                          <span className="text-[#c5a059] font-mono-code text-[11.5px] font-bold">{settings.folioYearsValue || '20+ Years'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-mono-code text-[11px]">{settings.folioAvailabilityLabel || 'Availability :'}</span>
                          <span className="text-emerald-400 font-mono-code text-[11px] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                            {settings.folioAvailabilityValue || 'Advisory & Development'}
                          </span>
                        </div>
                      </div>

                      {/* Official Digital Archive Seal */}
                      <div className="p-3 rounded-xl bg-[#131722] border border-[#232a3a] flex items-center gap-3 shadow-inner">
                        <div className="w-10 h-10 rounded-full bg-[#1b2130] border border-[#c5a059]/40 flex items-center justify-center shrink-0 text-[#c5a059] shadow-sm">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9.5px] font-mono-code text-[#c5a059] font-bold tracking-wider block uppercase">
                            {settings.folioSealText || 'VERIFIED ARCHIVE • HARDCOVER EDITION'}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono-code leading-tight mt-0.5">
                            Authenticated folio showcasing bespoke computational systems & personal consulting methodology.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#232733] flex items-center justify-between text-xs shrink-0 mt-3">
                      <span className="font-mono-code text-[11px] text-slate-400">{settings.folioFooterNote || 'FRONTISPIECE'}</span>
                      <button
                        onClick={() => onToggleBook(false)}
                        className="text-xs font-mono-code text-[#c5a059] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                      >
                        {settings.folioCloseText || '← Close Cover'}
                      </button>
                    </div>
                  </div>
                ) : displayLeftPage ? (
                  <PageRenderer
                    page={displayLeftPage}
                    projects={projects}
                    services={services}
                    settings={settings}
                    caseStudies={caseStudies}
                    onOpenProject={onOpenProject}
                    onOpenGallery={onOpenGallery}
                    onGoToPage={onPageChange}
                    onCloseBook={() => onToggleBook(false)}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center p-6 text-slate-400 text-xs">
                    Page blank
                  </div>
                )}
              </div>
            </div>

            {/* CENTER SPINAL GUTTER (THE PHYSICAL CREASE) */}
            <div className="w-4 h-full book-gutter-center relative shrink-0 z-30 shadow-2xl flex items-center justify-center">
              <div className="w-[1px] h-full bg-[#343a4d]/50" />
            </div>

            {/* RIGHT SPREAD PAGE */}
            <div
              id="book-right-page"
              className="relative flex-1 h-full bg-[#13161f] rounded-r-xl border-l border-[#1a1d26] overflow-hidden shadow-inner flex flex-col justify-between"
            >
              {/* Paper Crease / Ambient Spine Occlusion (Right) */}
              <div className="absolute top-0 left-0 bottom-0 w-16 book-spine-shadow-left pointer-events-none z-20" />

              {/* Page Content */}
              <div className="relative z-10 h-full overflow-hidden">
                {displayRightPage ? (
                  <PageRenderer
                    page={displayRightPage}
                    projects={projects}
                    services={services}
                    settings={settings}
                    caseStudies={caseStudies}
                    onOpenProject={onOpenProject}
                    onOpenGallery={onOpenGallery}
                    onGoToPage={onPageChange}
                    onCloseBook={() => onToggleBook(false)}
                  />
                ) : (
                  /* Back Cover Page */
                  <div className="h-full flex flex-col justify-between p-8 text-center bg-[#0d0f14]">
                    <div className="my-auto space-y-3.5">
                      {/* Logo Cover instead of star icon */}
                      {settings.coverLogo ? (
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#171b26] border-2 border-[#c5a059]/60 p-2 shadow-[0_6px_20px_rgba(197,160,89,0.3)] flex items-center justify-center overflow-hidden">
                          <img
                            src={settings.coverLogo}
                            alt="Logo"
                            className="w-full h-full object-contain rounded-xl"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#171b26] border border-[#c5a059]/40 flex items-center justify-center shadow-lg">
                          <BookOpen className="w-6 h-6 text-[#c5a059]" />
                        </div>
                      )}
                      <h4 className="text-xl font-bold text-white font-serif-luxury tracking-wider">{settings.name || 'BERLY'}</h4>
                      <p className="text-xs text-slate-400 font-mono-code tracking-widest uppercase">END OF BOOK</p>
                      <button
                        onClick={() => onToggleBook(false)}
                        className="mt-3 px-4 py-1.5 rounded-full bg-[#181c28] hover:bg-[#222736] border border-[#c5a059]/40 text-[11px] font-mono-code text-[#c5a059] tracking-wider transition-all cursor-pointer"
                      >
                        RETURN TO COVER
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3D FLIPPING LEAF (DYNAMIC PAGE-TURN LEAF) */}
            {(isAnimating || isDragging) && turnDirection && (
              <div
                className={`absolute top-0 bottom-0 w-1/2 preserve-3d pointer-events-none z-40 ${
                  isDragging
                    ? ''
                    : turnDirection === 'next'
                    ? 'animate-flip-next-leaf'
                    : 'animate-flip-prev-leaf'
                }`}
                style={{
                  left: '50%',
                  transformOrigin: 'left center',
                  ...(isDragging
                    ? {
                        transform:
                          turnDirection === 'next'
                            ? `rotateY(-${turnProgress}deg)`
                            : `rotateY(${-180 + turnProgress}deg)`,
                      }
                    : {}),
                }}
              >
                {/* FRONT FACE OF TURNING LEAF */}
                <div
                  className="absolute inset-0 bg-[#13161f] rounded-r-xl border border-[#2b3142] overflow-hidden backface-hidden shadow-2xl"
                  style={{
                    transform: 'rotateY(0deg)',
                  }}
                >
                  <div className="w-full h-full opacity-95">
                    {turningFrontPage ? (
                      <PageRenderer
                        page={turningFrontPage}
                        projects={projects}
                        services={services}
                        settings={settings}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 font-mono-code text-xs">BERLY ARCHIVES</div>
                    )}
                  </div>
                  {/* Dynamic Turn Shadow & Paper Bend Sheen */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20 pointer-events-none" />
                  <div className="absolute top-0 right-0 bottom-0 w-12 bg-gradient-to-l from-white/[0.07] to-transparent pointer-events-none" />
                </div>

                {/* BACK FACE OF TURNING LEAF */}
                <div
                  className="absolute inset-0 bg-[#13161f] rounded-l-xl border border-[#2b3142] overflow-hidden backface-hidden shadow-2xl"
                  style={{
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <div className="w-full h-full opacity-95">
                    {turningBackPage ? (
                      <PageRenderer
                        page={turningBackPage}
                        projects={projects}
                        services={services}
                        settings={settings}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 font-mono-code text-xs">BERLY ARCHIVES</div>
                    )}
                  </div>
                  {/* Dynamic Turn Shadow & Paper Bend Sheen */}
                  <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-transparent to-black/20 pointer-events-none" />
                  <div className="absolute top-0 left-0 bottom-0 w-12 bg-gradient-to-r from-white/[0.07] to-transparent pointer-events-none" />
                </div>
              </div>
            )}
          </>
        ) : (
          /* MOBILE SINGLE-PAGE VIEW */
          <div className="relative w-full h-full bg-[#13161f] rounded-xl overflow-hidden shadow-inner flex flex-col justify-between touch-pan-y">
            <div className="relative z-10 h-full overflow-y-auto">
              {visiblePages[currentPage - 1] ? (
                <PageRenderer
                  page={visiblePages[currentPage - 1]}
                  projects={projects}
                  services={services}
                  settings={settings}
                  caseStudies={caseStudies}
                  onOpenProject={onOpenProject}
                  onOpenGallery={onOpenGallery}
                  onGoToPage={onPageChange}
                  onCloseBook={() => onToggleBook(false)}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  Page not found
                </div>
              )}
            </div>

            {/* Mobile Swipe / Tap Hint */}
            <div className="py-1 px-2 bg-[#0e1017] border-t border-[#1e2332] flex items-center justify-between text-[10px] font-mono-code text-slate-400">
              <button
                onClick={prevPage}
                className="px-2 py-1 rounded bg-[#181c26] text-[#c5a059] flex items-center gap-1 active:scale-95"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span>Swipe / Scroll Left & Right</span>
              <button
                onClick={nextPage}
                className="px-2 py-1 rounded bg-[#181c26] text-[#c5a059] flex items-center gap-1 active:scale-95"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Hotspot Arrows (Available on both desktop and tablet/mobile edges) */}
        {(currentSpread > 0 || (isMobile && currentPage > 1)) && (
          <button
            id="book-hotspot-prev"
            onClick={prevPage}
            title="Halaman Sebelumnya (Scroll / Panah Kiri)"
            className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#12151f]/90 hover:bg-[#c5a059] text-white hover:text-black transition-all flex items-center justify-center z-30 shadow-2xl border border-[#c5a059]/40 active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
        {((!isMobile && currentSpread < maxSpread) || (isMobile && currentPage < totalPages)) && (
          <button
            id="book-hotspot-next"
            onClick={nextPage}
            title="Halaman Berikutnya (Scroll / Panah Kanan)"
            className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#12151f]/90 hover:bg-[#c5a059] text-white hover:text-black transition-all flex items-center justify-center z-30 shadow-2xl border border-[#c5a059]/40 active:scale-95 cursor-pointer backdrop-blur-md"
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>
    </div>
  );
};
