import React, { useState, useEffect } from 'react';
import {
  Globe,
  Cpu,
  Sparkles,
  BarChart3,
  Store,
  Layers,
  ExternalLink,
  ChevronRight,
  Send,
  CheckCircle2,
  Maximize2,
  ShieldCheck,
  Award,
  TrendingUp,
  Compass,
  Zap,
  Target,
  BookOpen,
} from 'lucide-react';
import {
  PortfolioPage,
  PortfolioProject,
  PortfolioService,
  PortfolioSettings,
  CaseStudyItem,
} from '../../types';
import { DEFAULT_CASE_STUDIES } from '../../data/defaultData';
import confetti from 'canvas-confetti';
import { DataService } from '../../firebase/service';

interface PageRendererProps {
  page: PortfolioPage;
  projects: PortfolioProject[];
  services: PortfolioService[];
  settings: PortfolioSettings;
  caseStudies?: CaseStudyItem[];
  onOpenProject?: (project: PortfolioProject) => void;
  onOpenGallery?: (images: string[], initialIndex?: number) => void;
  onGoToPage?: (pageNumber: number) => void;
  onCloseBook?: () => void;
}

// Smooth number counter from 0 to target
const AnimatedCounter: React.FC<{ target: number; suffix?: string; duration?: number }> = ({
  target,
  suffix = '',
  duration = 1400,
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    let animFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(ease * target));

      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    animFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrame);
  }, [target, duration]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
};

const serviceIconMap: Record<string, React.ReactNode> = {
  Globe: <Globe className="w-5 h-5 text-[#c5a059]" />,
  Cpu: <Cpu className="w-5 h-5 text-[#c5a059]" />,
  Sparkles: <Sparkles className="w-5 h-5 text-[#c5a059]" />,
  BarChart3: <BarChart3 className="w-5 h-5 text-[#c5a059]" />,
  Store: <Store className="w-5 h-5 text-[#c5a059]" />,
  Layers: <Layers className="w-5 h-5 text-[#c5a059]" />,
};

export const PageRenderer: React.FC<PageRendererProps> = ({
  page,
  projects,
  services,
  settings,
  caseStudies,
  onOpenProject,
  onOpenGallery,
  onGoToPage,
  onCloseBook,
}) => {
  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Contact subjects list from settings or defaults
  const subjectOptions =
    settings.contactSubjects && settings.contactSubjects.length > 0
      ? settings.contactSubjects
      : ['Virtual Assistant', 'Konsultasi Numerologi', 'Web Development'];

  const associatedProject = page.projectId
    ? projects.find((p) => p.id === page.projectId)
    : undefined;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactMessage.trim()) {
      setSubmitError('Harap lengkapi nama dan pesan Anda.');
      return;
    }
    if (!contactPhone.trim()) {
      setSubmitError('Harap cantumkan nomor WhatsApp Anda agar kami dapat menghubungi kembali.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const selectedSubject = contactSubject || subjectOptions[0] || 'Kebutuhan Umum';

      // 1. Format template WhatsApp
      const template =
        settings.whatsappMessageTemplate ||
        'Halo Berly, nama saya {name}. Saya ingin berkonsultasi mengenai {subject}.\n\nPesan:\n{message}';
      
      let formattedMessage = template
        .replace(/{name}/g, contactName)
        .replace(/{subject}/g, selectedSubject)
        .replace(/{message}/g, contactMessage);

      // Append client's WhatsApp number to WhatsApp message text so recipient admin clearly sees client's phone
      formattedMessage += `\n\n(Kontak WhatsApp Pengirim: ${contactPhone.trim()})`;

      // Destination WhatsApp number (Berly's WhatsApp from settings)
      const cleanDestPhone = (settings.whatsapp || '6281234567890').replace(/[^0-9]/g, '');

      // 2. Open WhatsApp directly with formatted message to Berly's WhatsApp
      const waUrl = `https://wa.me/${cleanDestPhone}?text=${encodeURIComponent(formattedMessage)}`;
      window.open(waUrl, '_blank');

      // 3. Save to database using client's actual WhatsApp phone number!
      const clientCleanPhone = contactPhone.trim().replace(/[^0-9]/g, '');
      const formattedClientPhone = clientCleanPhone.startsWith('0')
        ? '62' + clientCleanPhone.slice(1)
        : clientCleanPhone;

      await DataService.sendMessage({
        name: contactName.trim(),
        email: 'whatsapp-direct',
        whatsapp: formattedClientPhone || contactPhone.trim(),
        subject: selectedSubject,
        message: `[${selectedSubject}] ${contactMessage.trim()}`,
      });

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#c5a059', '#e8cca4', '#ffffff'],
      });

      setSubmitSuccess(true);
      setContactName('');
      setContactPhone('');
      setContactSubject('');
      setContactMessage('');
    } catch {
      setSubmitError('Terjadi kendala saat mengirim pesan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = (_pageNumber: number, title: string, subtitle?: string) => (
    <div className="mb-2 sm:mb-2.5 pb-1.5 sm:pb-2 border-b border-[#232733] flex items-center justify-between shrink-0">
      <div>
        <div className="text-[9.5px] sm:text-[10px] font-mono-code tracking-widest text-[#c5a059] uppercase">
          {subtitle || 'SECTION'}
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide font-display">
          {title}
        </h2>
      </div>
      <div className="flex items-center gap-1.5 opacity-60">
        <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
        <span className="w-1 h-1 rounded-full bg-[#c5a059]/50" />
      </div>
    </div>
  );

  switch (page.pageType) {
    case 'profile': {
      const profileImg =
        settings.profileImage ||
        page.imageUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
      const profileBio =
        settings.profileDescription ||
        page.content ||
        'Senior Full-Stack Architect & Digital Craftsman with a passion for high-performance web systems, bespoke interactive design, and resilient cloud architectures.';

      return (
        <div className="h-full flex flex-col justify-between p-3.5 sm:p-5 text-[#d1d5db] overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {renderHeader(
              page.pageNumber,
              page.title,
              settings.profileTagline || page.subtitle || 'BERLY — CREATIVE TECHNOLOGIST'
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 sm:gap-4 items-start">
                {/* LONJONG 9:16 ENLARGED PORTRAIT PHOTO */}
                <div className="sm:col-span-4 relative group">
                  <div className="w-full aspect-[9/14] sm:aspect-[9/15] max-w-[175px] sm:max-w-[200px] mx-auto rounded-2xl overflow-hidden bg-[#151821] border-2 border-[#c5a059]/50 shadow-[0_10px_25px_rgba(0,0,0,0.6)] relative group-hover:border-[#c5a059]/80 transition-all duration-300">
                    <img
                      src={profileImg}
                      alt="Berly Profile"
                      className="w-full h-full object-cover object-top grayscale contrast-125 group-hover:grayscale-0 transition-all duration-700"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f14]/85 via-transparent to-transparent opacity-75 pointer-events-none" />
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 text-left pointer-events-none">
                      <span className="text-xs sm:text-sm font-bold text-white tracking-wide truncate block drop-shadow-sm font-display">
                        {settings.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: BADGE, HEADLINE, BIO & ELEVATED COUNTER CARDS */}
                <div className="sm:col-span-8 space-y-2.5 pr-6 sm:pr-8">
                  {/* EDITABLE STATUS BADGE */}
                  {(settings.profileStatusBadge || 'Available for Strategic Projects') && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#c5a059]/10 border border-[#c5a059]/35 text-[#c5a059] text-[10.5px] font-medium">
                      <Sparkles className="w-3 h-3" />
                      <span>{settings.profileStatusBadge || 'Available for Strategic Projects'}</span>
                    </div>
                  )}

                  {/* EDITABLE HEADLINE (NOT FLAT / GEPENG: ELEGANT DISPLAY FONT WITH AMPLE LINE-HEIGHT) */}
                  <h3 className="text-[14.5px] sm:text-[16px] font-extrabold text-white leading-[1.4] tracking-normal font-sans">
                    {settings.profileHeadline || 'Transforming Complex Ideas into Tactile Digital Realities'}
                  </h3>

                  {/* BIO DESCRIPTION */}
                  <p className="text-[11.5px] sm:text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {profileBio}
                  </p>

                  {/* ELEVATED COUNTER CARDS (DIBUAT 2 BARIS RAPIH & LEGA, TIDAK BERTABRAKAN DENGAN TOMBOL NAVIGASI) */}
                  <div className="pt-2 space-y-2 text-xs font-mono-code">
                    {/* Row 1: Experience & Success Rate */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Counter 1: Experience */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-[#141720]/90 border border-[#242938] hover:border-[#c5a059]/40 transition-colors shadow-sm">
                        <div className="text-slate-400 text-[9.5px] flex items-center gap-1.5 mb-1 tracking-wider uppercase font-semibold">
                          <Award className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                          <span>EXPERIENCE</span>
                        </div>
                        <div className="text-[#c5a059] font-bold text-sm sm:text-base whitespace-nowrap">
                          <AnimatedCounter
                            target={Number(settings.profileExperience) || 8}
                            suffix={settings.profileExperienceSuffix || '+ Tahun'}
                          />
                        </div>
                      </div>

                      {/* Counter 2: Success Rate */}
                      <div className="p-2 sm:p-2.5 rounded-xl bg-[#141720]/90 border border-[#242938] hover:border-[#c5a059]/40 transition-colors shadow-sm">
                        <div className="text-slate-400 text-[9.5px] flex items-center gap-1.5 mb-1 tracking-wider uppercase font-semibold">
                          <TrendingUp className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                          <span>SUCCESS RATE</span>
                        </div>
                        <div className="text-[#c5a059] font-bold text-sm sm:text-base whitespace-nowrap">
                          <AnimatedCounter
                            target={Number(settings.profileSuccessRate) || 99}
                            suffix={settings.profileSuccessRateSuffix || '%'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Privacy (Wide Card, Clear & Highly Readable) */}
                    <div className="p-2 sm:p-2.5 rounded-xl bg-[#141720]/90 border border-[#242938] hover:border-[#4ade80]/40 transition-colors shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-lg bg-[#4ade80]/10 border border-[#4ade80]/30 text-[#4ade80]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[9.5px] text-slate-400 tracking-wider uppercase font-semibold block">
                            CONFIDENTIALITY & PRIVACY
                          </span>
                          <span className="text-[10px] text-slate-300 font-sans">
                            Kerahasiaan data klien terjamin penuh
                          </span>
                        </div>
                      </div>
                      <div className="text-[#4ade80] font-bold text-sm sm:text-base whitespace-nowrap pl-2">
                        <AnimatedCounter
                          target={Number(settings.profilePrivacyNumber) || 100}
                          suffix={settings.profilePrivacyLabel || '% Aman'}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: STRATEGIC FOCUS PILLARS (MENGISI RUANG KOSONG DI BAWAH PROFILE) */}
              <div className="mt-3.5 pt-3 border-t border-[#222838] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono-code text-[#c5a059] uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-[#c5a059]" />
                    KEY FOCUS PILLARS & METHODOLOGY
                  </span>
                  <span className="text-[9.5px] font-mono-code text-slate-400">
                    Holistic Consulting
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-[#131722] border border-[#232a3d] hover:border-[#c5a059]/40 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Compass className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <h4 className="text-[11.5px] font-bold text-white tracking-wide">
                        {settings.profilePillar1Title || 'Personal Potential & Life Path'}
                      </h4>
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-relaxed font-normal">
                      {settings.profilePillar1Desc ||
                        'Bespoke personal consultations utilizing Numerology, strategic alignment, and discrete life guidance.'}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#131722] border border-[#232a3d] hover:border-[#c5a059]/40 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                      <h4 className="text-[11.5px] font-bold text-white tracking-wide">
                        {settings.profilePillar2Title || 'Enterprise Digital Solutions'}
                      </h4>
                    </div>
                    <p className="text-[10.5px] text-slate-300 leading-relaxed font-normal">
                      {settings.profilePillar2Desc ||
                        'Custom cloud architecture, high-performance web systems, and intelligent business automation.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-1 border-t border-[#232733] flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="font-mono-code text-[11px]">{settings.profileFooterLeft || 'BERLY // DIGITAL ARCHIVES'}</span>
            <button
              onClick={() => onGoToPage && onGoToPage(page.pageNumber + 1)}
              className="inline-flex items-center gap-1.5 text-xs text-[#c5a059] hover:underline cursor-pointer"
            >
              <span>{settings.profileFooterRight || 'Next Section'}</span> <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    case 'services':
      return (
        <div className="h-full flex flex-col justify-between p-3 sm:p-4 text-[#d1d5db] overflow-hidden pl-5 sm:pl-7 pr-3 sm:pr-4">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {renderHeader(
              page.pageNumber,
              page.title,
              settings.servicesTagline || page.subtitle || 'CORE CAPABILITIES'
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 py-0.5">
                {services.map((srv, idx) => (
                  <div
                    key={srv.id}
                    className="p-2 sm:p-2.5 rounded-xl bg-[#131620] border border-[#242b3d] hover:border-[#c5a059]/60 transition-all duration-200 group flex flex-col justify-between shadow-sm"
                  >
                    {/* Header: Icon + Number Badge */}
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="p-1 rounded-md bg-[#1c2230] border border-[#2d364a] text-[#c5a059] group-hover:scale-105 group-hover:border-[#c5a059]/60 transition-all shrink-0">
                          {serviceIconMap[srv.iconName] || <Cpu className="w-3.5 h-3.5 text-[#c5a059]" />}
                        </div>
                        <span className="text-[9.5px] font-mono-code text-slate-400 uppercase tracking-wider font-semibold">
                          SOLUTION
                        </span>
                      </div>
                      <span className="font-mono-code text-[10px] font-bold text-[#c5a059] px-1.5 py-0.5 rounded bg-[#1c2230] border border-[#2d364a] shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    {/* Service Title (Allows clean multiline wrap, no truncation/dots) */}
                    <h4 className="text-[11.5px] sm:text-[12px] font-bold text-white tracking-wide leading-snug mb-1 font-sans">
                      {srv.title}
                    </h4>

                    {/* Service Description (Clear, legible, perfectly balanced within card) */}
                    <p className="text-[10px] sm:text-[10.5px] text-slate-300 leading-relaxed font-normal">
                      {srv.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 mt-1 border-t border-[#232733] flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="font-mono-code text-[11px]">{settings.servicesFooterLeft || 'END-TO-END SUITE'}</span>
            <button
              onClick={() => onGoToPage && onGoToPage(page.pageNumber + 1)}
              className="text-xs text-[#c5a059] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>{settings.servicesFooterRight || 'Explore Portfolio'}</span> <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );

    case 'portfolio': {
      // 5 items per page requirement
      const chunkIndex = (page as unknown as { portfolioChunkIndex?: number }).portfolioChunkIndex || 0;
      const startIndex = chunkIndex * 5;
      const pageProjects = projects.slice(startIndex, startIndex + 5);

      return (
        <div className="h-full flex flex-col justify-between p-3.5 sm:p-5 text-[#d1d5db] overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {renderHeader(
              page.pageNumber,
              page.title,
              settings.portfolioTagline ||
                page.subtitle ||
                `INDEXED PROJECTS (${startIndex + 1}-${Math.min(startIndex + 5, projects.length)})`
            )}

            <p className="text-[11px] sm:text-xs text-slate-300 mb-1.5 leading-snug shrink-0">
              Koleksi karya unggulan. Tekan salah satu proyek untuk melihat deskripsi, foto, dan membuka live project:
            </p>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
              {pageProjects.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => onOpenProject && onOpenProject(p)}
                  className="p-2 sm:p-2.5 rounded-xl bg-[#13161f] border border-[#242938] hover:border-[#c5a059] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono-code text-[11px] text-[#c5a059] font-bold shrink-0">
                      {String(startIndex + idx + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-xs font-bold text-white truncate group-hover:text-[#c5a059] transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate">
                        {p.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono-code px-2 py-0.5 rounded bg-[#1f2433] text-slate-300 hidden sm:inline-block">
                      Lihat Project
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#c5a059] transition-colors" />
                  </div>
                </div>
              ))}

              {pageProjects.length === 0 && (
                <div className="p-6 text-center text-xs font-mono-code text-slate-400">
                  Belum ada proyek pada halaman ini.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 mt-1 border-t border-[#232733] flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="font-mono-code text-[11px]">
              {settings.portfolioFooterLeft || 'PORTFOLIO ARCHIVE'}
            </span>
            <span className="text-xs text-[#c5a059] font-mono-code">
              {settings.portfolioFooterRight || `${projects.length} Total Projects`}
            </span>
          </div>
        </div>
      );
    }
    case 'project':
    case 'web-app':
    case 'digitalization': {
      const proj = associatedProject || projects[0];
      if (!proj) {
        return (
          <div className="h-full flex items-center justify-center p-6 text-slate-400 font-mono-code text-xs">
            Project data unavailable.
          </div>
        );
      }

      return (
        <div className="h-full flex flex-col justify-between p-3.5 sm:p-5 text-[#d1d5db] overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {renderHeader(page.pageNumber, page.title || proj.title, page.subtitle || proj.category)}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
              {/* COVER IMAGE */}
              <div className="relative rounded-xl overflow-hidden border border-[#292f40] group bg-[#07090e] flex items-center justify-center p-1">
                <img
                  src={proj.coverImage}
                  alt={proj.title}
                  className="w-full max-h-44 sm:max-h-52 object-contain group-hover:scale-102 transition-transform duration-500 rounded-lg"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c0e14]/90 via-transparent to-transparent opacity-80 pointer-events-none" />
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#000000]/80 border border-[#c5a059]/40 text-[#c5a059]">
                    {proj.category}
                  </span>
                  {proj.gallery && proj.gallery.length > 0 && onOpenGallery && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenGallery(proj.gallery);
                      }}
                      className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-[#000000]/85 hover:bg-[#c5a059] hover:text-black transition-colors text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" /> Galeri Foto ({proj.gallery.length})
                    </button>
                  )}
                </div>
              </div>

              {/* GALLERY THUMBNAILS (UP TO 3 PHOTOS IF AVAILABLE) */}
              {proj.gallery && proj.gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {proj.gallery.slice(0, 3).map((imgUrl, i) => (
                    <div
                      key={i}
                      onClick={() => onOpenGallery && onOpenGallery(proj.gallery!, i)}
                      className="relative rounded-lg overflow-hidden h-12 sm:h-14 border border-[#252b3b] bg-black group cursor-pointer"
                    >
                      <img
                        src={imgUrl}
                        alt={`${proj.title} foto ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent transition-colors" />
                    </div>
                  ))}
                </div>
              )}

              {/* EXECUTIVE SUMMARY / DESCRIPTION ONLY */}
              <div className="space-y-2 text-xs">
                <div className="p-2.5 sm:p-3 rounded-xl bg-[#141722] border border-[#232838]">
                  <span className="text-[9.5px] font-mono-code text-[#c5a059] font-bold block mb-1">
                    EXECUTIVE SUMMARY
                  </span>
                  <p className="text-slate-300 leading-relaxed text-[11px] sm:text-xs">
                    {proj.description || proj.shortDescription}
                  </p>
                </div>

                {/* OPEN LIVE PROJECT BUTTON */}
                {(proj.liveUrl || proj.externalUrl) && (
                  <div>
                    <a
                      href={proj.liveUrl || proj.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#c5a059] via-[#e2c889] to-[#c5a059] hover:opacity-95 text-black font-bold tracking-wider text-xs font-mono-code shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>OPEN LIVE PROJECT</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-2 mt-1 border-t border-[#232733] flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="font-mono-code text-[10px] text-slate-500">
              PROYEK // {proj.category?.toUpperCase() || 'PROJECT'}
            </span>
            <span className="font-mono-code text-[10px] text-[#c5a059]">
              PAGE {String(page.pageNumber).padStart(2, '0')}
            </span>
          </div>
        </div>
      );
    }

    case 'case-study': {
      const activeCaseStudy =
        caseStudies && caseStudies.length > 0 ? caseStudies[0] : DEFAULT_CASE_STUDIES[0];

      return (
        <div className="h-full flex flex-col justify-between p-3.5 sm:p-5 text-[#d1d5db] overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {renderHeader(
              page.pageNumber,
              page.title,
              settings.caseStudyTagline || page.subtitle || 'ENTERPRISE ARCHITECTURE'
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-2.5 sm:p-3 rounded-xl bg-[#141722] border border-[#262c3d]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9.5px] font-mono-code text-[#c5a059] font-bold">
                    CLIENT PROFILE
                  </span>
                  <span className="text-[9.5px] font-mono-code text-slate-400 uppercase">
                    {activeCaseStudy.client}
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white mb-0.5">
                  {activeCaseStudy.title}
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                  {activeCaseStudy.summary}
                </p>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-start gap-2 p-1.5 sm:p-2 rounded-lg bg-[#151824]/60 border border-[#212636]">
                  <span className="w-4 h-4 rounded-full bg-[#c5a059]/20 text-[#c5a059] text-[9px] font-mono-code font-bold flex items-center justify-center shrink-0 mt-0.5">
                    01
                  </span>
                  <div className="text-[11px] leading-snug">
                    <span className="font-bold text-white">The Bottleneck:</span>{' '}
                    {activeCaseStudy.challenge}
                  </div>
                </div>
                <div className="flex items-start gap-2 p-1.5 sm:p-2 rounded-lg bg-[#151824]/60 border border-[#212636]">
                  <span className="w-4 h-4 rounded-full bg-[#c5a059]/20 text-[#c5a059] text-[9px] font-mono-code font-bold flex items-center justify-center shrink-0 mt-0.5">
                    02
                  </span>
                  <div className="text-[11px] leading-snug">
                    <span className="font-bold text-white">The Deployment:</span>{' '}
                    {activeCaseStudy.solution}
                  </div>
                </div>
                <div className="flex items-start gap-2 p-1.5 sm:p-2 rounded-lg bg-[#151824]/60 border border-[#212636]">
                  <span className="w-4 h-4 rounded-full bg-[#c5a059]/20 text-[#c5a059] text-[9px] font-mono-code font-bold flex items-center justify-center shrink-0 mt-0.5">
                    03
                  </span>
                  <div className="text-[11px] leading-snug">
                    <span className="font-bold text-white">The ROI:</span>{' '}
                    {activeCaseStudy.result}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-1 border-t border-[#232733] flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="font-mono-code text-[11px]">{settings.caseStudyFooterLeft || 'CASE STUDY ARCHIVE'}</span>
            <span className="font-mono-code text-[#c5a059] text-[11px]">
              {settings.caseStudyFooterRight || 'ENTERPRISE ARCHITECTURE'}
            </span>
          </div>
        </div>
      );
    }

    case 'contact':
      return (
        <div className="h-full flex flex-col justify-between p-3.5 sm:p-5 text-[#d1d5db] overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {renderHeader(
              page.pageNumber,
              page.title,
              settings.contactTagline || page.subtitle || 'DIRECT TRANSMISSION'
            )}

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {submitSuccess ? (
                <div className="p-3 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/40 text-center my-2 space-y-1.5">
                  <CheckCircle2 className="w-6 h-6 text-[#c5a059] mx-auto" />
                  <h4 className="text-sm font-bold text-white font-display">Pesan Diteruskan ke WhatsApp</h4>
                  <p className="text-[11px] text-slate-300">
                    Terima kasih! WhatsApp telah terbuka secara otomatis dengan pesan Anda.
                  </p>
                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="mt-1 text-xs font-mono-code text-[#c5a059] underline hover:text-white cursor-pointer"
                  >
                    Kirim Pesan Lainnya
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-2 text-xs">
                  {submitError && (
                    <div className="p-1.5 rounded bg-red-950/40 border border-red-800 text-red-200 text-[10px]">
                      {submitError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9.5px] font-mono-code text-slate-400 mb-0.5">
                        NAMA LENGKAP *
                      </label>
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. John Doe"
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#12151e] border border-[#272d3e] text-white text-xs focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] font-mono-code text-slate-400 mb-0.5 flex items-center justify-between">
                        <span>NOMOR WHATSAPP ANDA *</span>
                        <span className="text-[8.5px] text-[#c5a059]">08xx / 62xx</span>
                      </label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="e.g. 081234567890"
                        required
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#12151e] border border-[#272d3e] text-white text-xs font-mono-code focus:border-[#c5a059] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-mono-code text-slate-400 mb-0.5">
                      KEBUTUHAN / SUBJEK LAYANAN *
                    </label>
                    <select
                      value={contactSubject || subjectOptions[0]}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#12151e] border border-[#272d3e] text-white text-xs focus:border-[#c5a059] focus:outline-none cursor-pointer"
                    >
                      {subjectOptions.map((subj, idx) => (
                        <option key={idx} value={subj} className="bg-[#12151e] text-white py-1">
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9.5px] font-mono-code text-slate-400 mb-0.5">
                      PESAN KONSULTASI *
                    </label>
                    <textarea
                      rows={2.5}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Ceritakan rencana proyek, target waktu, atau kebutuhan sistem Anda..."
                      required
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#12151e] border border-[#272d3e] text-white text-xs focus:border-[#c5a059] focus:outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 px-3 rounded-lg bg-[#c5a059] hover:bg-[#d8b368] active:scale-[0.99] text-black font-semibold tracking-wider text-xs transition-all flex items-center justify-center gap-2 cursor-pointer font-mono-code disabled:opacity-50 shadow-md"
                  >
                    <Send className="w-3 h-3" />
                    {isSubmitting ? 'MENYIAPKAN WHATSAPP...' : 'KIRIM PESAN KE WHATSAPP'}
                  </button>
                </form>
              )}

              <div className="pt-2 mt-2 border-t border-[#232733] flex items-center justify-between text-slate-400 text-xs">
                <div className="flex items-center gap-1 text-[10px] font-mono-code text-slate-400">
                  <ShieldCheck className="w-3 h-3 text-[#4ade80]" />
                  <span>Enkripsi End-to-End WhatsApp</span>
                </div>
                <div className="text-[10px] font-mono-code text-[#c5a059]">
                  Direct Verification
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 mt-1 border-t border-[#232733] flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span className="font-mono-code text-[10px] text-slate-500">{settings.contactFooterLeft || 'DIRECT TRANSMISSION'}</span>
            <span className="font-mono-code text-[10px] text-[#c5a059]">
              {settings.contactFooterRight || 'SECURE DISPATCH'}
            </span>
          </div>
        </div>
      );

    case 'back-cover':
      return (
        <div className="h-full flex flex-col justify-between p-6 sm:p-10 text-center bg-[#0e1017]">
          <div className="my-auto space-y-4">
            {/* COVER LOGO INSTEAD OF STAR/SPARKLES */}
            {settings.coverLogo ? (
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-[#171b26] border-2 border-[#c5a059]/60 p-2 shadow-[0_8px_25px_rgba(197,160,89,0.25)] flex items-center justify-center overflow-hidden">
                <img
                  src={settings.coverLogo}
                  alt="Logo"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-[#181c26] border border-[#c5a059]/40 flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-[#c5a059]" />
              </div>
            )}
            <h2 className="text-2xl sm:text-3xl font-bold text-white font-serif-luxury tracking-wider">
              {settings.name || 'BERLY'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto font-mono-code tracking-widest uppercase">
              END OF BOOK
            </p>
            <div className="w-20 h-0.5 bg-[#c5a059]/40 mx-auto" />
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Thank you for exploring this digital volume. Let us craft something exceptional together.
            </p>

            {onCloseBook && (
              <button
                onClick={onCloseBook}
                className="mt-4 px-5 py-2 rounded-full bg-[#181c28] hover:bg-[#232838] border border-[#c5a059]/40 text-xs font-mono-code text-[#c5a059] tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                CLOSE BOOK & RETURN TO COVER
              </button>
            )}
          </div>

          <div className="text-[10px] font-mono-code text-slate-400 pt-2 border-t border-[#1e2330]">
            © {new Date().getFullYear()} {settings.name || 'BERLY'}. ALL RIGHTS RESERVED.
          </div>
        </div>
      );

    default:
      return (
        <div className="h-full flex flex-col justify-between p-6 sm:p-8 text-[#d1d5db]">
          <div>
            {renderHeader(page.pageNumber, page.title, page.subtitle)}
            <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
              {page.content}
            </div>
          </div>
          <div className="pt-3 border-t border-[#232733] flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono-code text-[11px]">{page.title}</span>
            <span className="font-mono-code text-[#c5a059] text-[11px]">
              BERLY ARCHIVE
            </span>
          </div>
        </div>
      );
  }
};
