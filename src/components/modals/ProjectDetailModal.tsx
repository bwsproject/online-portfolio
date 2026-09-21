import React from 'react';
import { X, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { PortfolioProject } from '../../types';

interface ProjectDetailModalProps {
  project: PortfolioProject | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenGallery?: (images: string[], initialIndex?: number) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
  onOpenGallery,
}) => {
  if (!isOpen || !project) return null;

  // Up to 3 other photos from gallery
  const otherPhotos = (project.gallery || []).filter(Boolean).slice(0, 3);
  const liveUrl = project.liveUrl || project.externalUrl;

  return (
    <div
      id="project-detail-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="project-detail-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] bg-[#12141d] border border-[#272d3e] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header Bar */}
        <div className="p-5 border-b border-[#1f2434] bg-[#151822] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono-code text-[#c5a059] tracking-widest uppercase">
              {project.category || 'PORTFOLIO DETAIL'}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white font-display">
              {project.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#202535] transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content: HANYA ADA FOTO, DESKRIPSI DAN OPEN LIVE PROJECT */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-300 text-xs sm:text-sm">
          {/* Main Cover Visual */}
          {project.coverImage && (
            <div className="relative rounded-xl overflow-hidden border border-[#262c3d] bg-[#07090e] flex items-center justify-center p-1 sm:p-2 min-h-[220px]">
              <img
                src={project.coverImage}
                alt={project.title}
                className="w-auto max-w-full max-h-[380px] sm:max-h-[480px] object-contain rounded-lg shadow-xl"
                loading="lazy"
              />
            </div>
          )}

          {/* 3 Other Photos (Gallery if uploaded) */}
          {otherPhotos.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono-code text-[#c5a059] uppercase tracking-wider block">
                FOTO DOKUMENTASI PROYEK ({otherPhotos.length})
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {otherPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    onClick={() => onOpenGallery && onOpenGallery(otherPhotos, idx)}
                    className="group relative aspect-video rounded-lg overflow-hidden border border-[#262c3e] bg-[#0c0d12] cursor-pointer hover:border-[#c5a059] transition-all"
                  >
                    <img
                      src={photo}
                      alt={`${project.title} preview ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <ImageIcon className="w-4 h-4 text-white drop-shadow" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Executive Summary / Description */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-mono-code text-[#c5a059] uppercase tracking-wider">
              EXECUTIVE SUMMARY
            </h4>
            <div className="leading-relaxed text-slate-200 whitespace-pre-line text-sm bg-[#151822]/60 p-4 rounded-xl border border-[#222736]">
              {project.description || project.shortDescription}
            </div>
          </div>
        </div>

        {/* Footer: Open Live Project */}
        <div className="p-4 border-t border-[#1f2434] bg-[#10121a] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#1a1e2b] hover:bg-[#242a3c] text-slate-300 text-xs font-mono-code transition-colors cursor-pointer"
          >
            Tutup
          </button>
          {liveUrl ? (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#c5a059] to-[#dfbf75] hover:opacity-95 text-black font-bold text-xs font-mono-code flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              <span>OPEN LIVE PROJECT</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <span className="text-[11px] font-mono-code text-slate-400">
              Internal / Confidential Build
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
