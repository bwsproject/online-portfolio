import React from 'react';
import { X, BookOpen, ChevronRight, Sparkles, Bookmark } from 'lucide-react';
import { PortfolioPage } from '../../types';

interface TableOfContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pages: PortfolioPage[];
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
}

export const TableOfContentsModal: React.FC<TableOfContentsModalProps> = ({
  isOpen,
  onClose,
  pages,
  currentPage,
  onSelectPage,
}) => {
  if (!isOpen) return null;

  const visiblePages = pages.filter((p) => p.visible);

  return (
    <div
      id="toc-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="toc-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[85vh] bg-[#11141c] border border-[#272d3e] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-5 border-b border-[#202535] flex items-center justify-between bg-[#141722]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#1d2232] border border-[#2e364c] text-[#c5a059]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-display">DAFTAR ISI</h3>
              <p className="text-[11px] font-mono-code text-slate-400">
                PILIH BAGIAN BUKU • {visiblePages.length} SECTIONS
              </p>
            </div>
          </div>

          <button
            id="toc-close-btn"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-[#202536] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section List (No Page Numbers) */}
        <div className="p-4 overflow-y-auto space-y-1.5 divide-y divide-[#1b202c]">
          {visiblePages.map((p) => {
            const isCurrent = p.pageNumber === currentPage;
            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectPage(p.pageNumber);
                  onClose();
                }}
                className={`pt-2 first:pt-0 p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                  isCurrent
                    ? 'bg-[#c5a059]/15 border border-[#c5a059]/40 text-white'
                    : 'hover:bg-[#181c28] text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
                      isCurrent
                        ? 'bg-[#c5a059] text-black'
                        : 'bg-[#1a1f2c] text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-black transition-colors'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold truncate group-hover:text-white transition-colors">
                      {p.title}
                    </h4>
                    {p.subtitle && (
                      <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                        {p.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isCurrent && (
                    <span className="text-[10px] font-mono-code text-[#c5a059] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> CURRENT
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#c5a059] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#202535] bg-[#0e1017] text-center text-[11px] font-mono-code text-slate-400">
          TEKAN UNTUK LANGSUNG MENUJU BAGIAN
        </div>
      </div>
    </div>
  );
};
