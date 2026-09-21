/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  PortfolioPage,
  PortfolioProject,
  PortfolioService,
  PortfolioSettings,
  CaseStudyItem,
} from './types';
import { DEFAULT_SETTINGS } from './data/defaultData';
import { DataService, AuthService } from './firebase/service';
import { BookEngine } from './components/book/BookEngine';
import { BookControls } from './components/navigation/BookControls';
import { TableOfContentsModal } from './components/modals/TableOfContentsModal';
import { LightboxModal } from './components/modals/LightboxModal';
import { ProjectDetailModal } from './components/modals/ProjectDetailModal';
import { AdminDashboard } from './components/admin/AdminDashboard';

export default function App() {
  // Application Data States
  const [pages, setPages] = useState<PortfolioPage[]>([]);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [services, setServices] = useState<PortfolioService[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings>(DEFAULT_SETTINGS);
  const [caseStudies, setCaseStudies] = useState<CaseStudyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Book Navigation States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [bookOpen, setBookOpen] = useState<boolean>(false);

  // Audio Page-Turn Feedback State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Modals States
  const [isContentsOpen, setIsContentsOpen] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number>(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Tactile synthesized realistic paper flip sound
  const playPageSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 1. Paper rustle noise layer (crisp physical page texture)
      const bufferSize = Math.floor(ctx.sampleRate * 0.18); // 180ms audible paper swipe
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.sin((i / bufferSize) * Math.PI) * Math.exp(-i / (bufferSize * 0.6));
        data[i] = (Math.random() * 2 - 1) * envelope;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(800, now + 0.18); // Frequency drops as paper lands
      filter.Q.value = 1.0;

      const gain = ctx.createGain();
      // Increased volume per user request (from 0.04 to 0.14)
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.002, now + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);

      // 2. Subtle low-mid thump layer (representing page landing onto book stack)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now + 0.05);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.16);

      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.setValueAtTime(0.07, now + 0.06);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now + 0.05);
      osc.stop(now + 0.18);
    } catch {
      // AudioContext policy handled gracefully
    }
  }, [soundEnabled]);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      const [fetchedPages, fetchedProjects, fetchedServices, fetchedSettings, fetchedCaseStudies] =
        await Promise.all([
          DataService.getPages(),
          DataService.getProjects(),
          DataService.getServices(),
          DataService.getSettings(),
          DataService.getCaseStudies(),
        ]);

      setPages(fetchedPages);
      setProjects(fetchedProjects);
      setServices(fetchedServices);
      setSettings(fetchedSettings);
      setCaseStudies(fetchedCaseStudies);
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Safety guard: Ensure loading screen never hangs more than 1.5 seconds under any network conditions
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    loadData().finally(() => {
      clearTimeout(safetyTimer);
    });

    // Check auth status
    const unsub = AuthService.onAuthStateChange((session) => {
      setIsAdminLoggedIn(session.isAuthenticated);
    });
    return () => unsub();
  }, [loadData]);

  const visiblePages = useMemo(() => {
    // Exclude individual project pages and creative projects per user requirement:
    // (PROJECT DETAIL, WEB APPLICATION, DIGITALIZATION, NUMEROLOGY WEB APP, RESTAURANT / POS SYSTEM, DASHBOARD & DATA, CREATIVE PROJECT)
    // because all of these works are already integrated into the PORTFOLIO page.
    const EXCLUDED_PAGE_TYPES = new Set(['about', 'technology', 'project', 'web-app', 'digitalization', 'creative']);
    const EXCLUDED_TITLE_KEYWORDS = [
      'project detail',
      'web application',
      'digitalization',
      'numerology',
      'restaurant',
      'pos system',
      'dashboard & data',
      'creative project',
      'creative projects',
    ];

    const basePages = pages
      .filter((p) => {
        if (!p.visible) return false;
        if (EXCLUDED_PAGE_TYPES.has(p.pageType)) return false;
        const lowerTitle = (p.title || '').toLowerCase();
        if (EXCLUDED_TITLE_KEYWORDS.some((kw) => lowerTitle.includes(kw))) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.pageOrder - b.pageOrder);

    const expandedPages: (PortfolioPage & { portfolioChunkIndex?: number })[] = [];

    for (const p of basePages) {
      if (p.pageType === 'portfolio') {
        const numChunks = Math.max(1, Math.ceil(projects.length / 5));
        for (let i = 0; i < numChunks; i++) {
          expandedPages.push({
            ...p,
            id: i === 0 ? p.id : `${p.id}-chunk-${i + 1}`,
            portfolioChunkIndex: i,
            title: p.title,
            subtitle: numChunks > 1 ? `SELECTED WORKS • PART ${i + 1}` : 'SELECTED WORKS',
          });
        }
      } else {
        expandedPages.push(p);
      }
    }

    return expandedPages.map((p, index) => ({
      ...p,
      pageNumber: index + 1,
    }));
  }, [pages, projects]);
  const totalPages = visiblePages.length;

  const handlePageChange = (newPage: number) => {
    const clamped = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(clamped);
    playPageSound();
  };

  const handleToggleBook = (open: boolean) => {
    setBookOpen(open);
    if (open && currentPage === 0) {
      setCurrentPage(1);
    }
    playPageSound();
  };

  const handlePrev = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      if (currentPage > 1) {
        handlePageChange(currentPage - 1);
      } else {
        handleToggleBook(false);
      }
    } else {
      const curSpread = Math.floor(currentPage / 2);
      if (curSpread > 0) {
        const target = curSpread - 1 === 0 ? 1 : (curSpread - 1) * 2;
        handlePageChange(target);
      } else {
        handleToggleBook(false);
      }
    }
  };

  const handleNext = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      if (currentPage < totalPages) {
        handlePageChange(currentPage + 1);
      }
    } else {
      const curSpread = Math.floor(currentPage / 2);
      const maxSpread = Math.ceil(totalPages / 2);
      if (curSpread < maxSpread) {
        const target = (curSpread + 1) * 2;
        handlePageChange(Math.min(target, totalPages));
      }
    }
  };

  const handleOpenGallery = (images: string[], initialIndex = 0) => {
    setGalleryImages(images);
    setGalleryIndex(initialIndex);
    setIsGalleryOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center text-white space-y-4 font-mono-code">
        <div className="w-12 h-12 rounded-full border-2 border-[#c5a059] border-t-transparent animate-spin" />
        <div className="text-xs text-slate-400 tracking-widest uppercase">
          INITIALIZING 3D ENGINE...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col justify-between overflow-x-hidden relative selection:bg-[#c5a059] selection:text-black">
      {/* Ambient Lighting & Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#c5a059]/10 rounded-full blur-[140px]" />
        <div className="absolute -bottom-40 left-1/4 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[160px]" />
      </div>

      {/* Main 3D Book Stage */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-2 sm:px-6 my-auto pt-3 sm:pt-4 pb-16 sm:pb-20">
        <BookEngine
          pages={visiblePages}
          projects={projects}
          services={services}
          settings={settings}
          caseStudies={caseStudies}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          bookOpen={bookOpen}
          onToggleBook={handleToggleBook}
          onOpenProject={(proj) => setSelectedProject(proj)}
          onOpenGallery={handleOpenGallery}
        />
      </main>

      {/* Floating Bottom Navigation Bar */}
      <BookControls
        currentPage={currentPage}
        totalPages={totalPages}
        bookOpen={bookOpen}
        onPrev={handlePrev}
        onNext={handleNext}
        onGoToPage={handlePageChange}
        onToggleBook={handleToggleBook}
        onOpenContents={() => setIsContentsOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        pages={visiblePages}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
      />

      {/* Table of Contents Modal */}
      <TableOfContentsModal
        isOpen={isContentsOpen}
        onClose={() => setIsContentsOpen(false)}
        pages={visiblePages}
        currentPage={currentPage}
        onSelectPage={(num) => {
          handleToggleBook(true);
          handlePageChange(num);
        }}
      />

      {/* Lightbox Gallery Modal */}
      <LightboxModal
        images={galleryImages}
        initialIndex={galleryIndex}
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
      />

      {/* Project Deep Inspection Modal */}
      <ProjectDetailModal
        project={selectedProject}
        isOpen={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        onOpenGallery={handleOpenGallery}
      />

      {/* Full Admin CMS Dashboard */}
      <AdminDashboard
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onDataUpdated={loadData}
        pages={pages}
        projects={projects}
        services={services}
        settings={settings}
      />
    </div>
  );
}
