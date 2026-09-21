import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move, Maximize2 } from 'lucide-react';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedBase64: string) => void;
  // Aspect ratio: width / height (e.g., 16 / 9 for landscape, 9 / 16 for portrait, 1 for square)
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
  title?: string;
  description?: string;
  allowRatioChange?: boolean;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
  aspectRatio = 16 / 9,
  outputWidth = 1280,
  outputHeight = 720,
  title,
  description,
  allowRatioChange = true,
}) => {
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [activeRatio, setActiveRatio] = useState<number>(aspectRatio);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>('cover');

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync activeRatio if prop changes when opening
  useEffect(() => {
    if (isOpen) {
      setActiveRatio(aspectRatio);
    }
  }, [isOpen, aspectRatio]);

  // Responsive container viewport calculation based on active aspect ratio
  let containerW = 340;
  let containerH = 191;
  if (activeRatio >= 1.2) {
    // Landscape (e.g. 16:9, 4:3)
    containerW = 340;
    containerH = Math.round(340 / activeRatio);
  } else if (activeRatio >= 0.9 && activeRatio < 1.2) {
    // Square (1:1)
    containerW = 270;
    containerH = 270;
  } else {
    // Portrait (e.g. 9:16)
    containerH = 360;
    containerW = Math.round(360 * activeRatio);
  }

  // Load natural dimensions of the image to preserve true aspect ratio
  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    const img = new Image();
    img.onload = () => {
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setFitMode('cover');
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Handle Drag / Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Calculate base dimensions respecting natural aspect ratio inside the 9:16 container
  const calculateBaseDisplaySize = () => {
    if (!naturalDimensions.width || !naturalDimensions.height) {
      return { width: containerW, height: containerH };
    }
    const imgAspect = naturalDimensions.width / naturalDimensions.height;
    const boxAspect = containerW / containerH; // 9 / 16

    if (fitMode === 'cover') {
      if (imgAspect > boxAspect) {
        // Image is wider than 9:16 -> Height fits containerH, width overflows
        const height = containerH;
        const width = containerH * imgAspect;
        return { width, height };
      } else {
        // Image is taller or same as 9:16 -> Width fits containerW, height overflows
        const width = containerW;
        const height = containerW / imgAspect;
        return { width, height };
      }
    } else {
      // Contain mode
      if (imgAspect > boxAspect) {
        const width = containerW;
        const height = containerW / imgAspect;
        return { width, height };
      } else {
        const height = containerH;
        const width = containerH * imgAspect;
        return { width, height };
      }
    }
  };

  const baseSize = calculateBaseDisplaySize();

  // Execute Canvas Crop calculation
  const handleSaveCrop = () => {
    const container = containerRef.current;
    if (!container || !naturalDimensions.width || !naturalDimensions.height) return;

    // Calculate final output dimensions
    let finalOutW = outputWidth;
    let finalOutH = outputHeight;
    if (Math.abs(activeRatio - 16 / 9) < 0.05) {
      finalOutW = 960;
      finalOutH = 540;
    } else if (Math.abs(activeRatio - 4 / 3) < 0.05) {
      finalOutW = 800;
      finalOutH = 600;
    } else if (Math.abs(activeRatio - 1) < 0.05) {
      finalOutW = 640;
      finalOutH = 640;
    } else if (Math.abs(activeRatio - 9 / 16) < 0.05) {
      finalOutW = 540;
      finalOutH = 960;
    } else {
      finalOutW = Math.min(outputWidth, 960);
      finalOutH = Math.round(finalOutW / activeRatio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = finalOutW;
    canvas.height = finalOutH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill background with luxury dark tone
    ctx.fillStyle = '#12151f';
    ctx.fillRect(0, 0, finalOutW, finalOutH);

    const displayedW = baseSize.width * scale;
    const displayedH = baseSize.height * scale;

    const containerCenterX = containerW / 2;
    const containerCenterY = containerH / 2;
    const imgLeftInContainer = containerCenterX - displayedW / 2 + position.x;
    const imgTopInContainer = containerCenterY - displayedH / 2 + position.y;

    const multiplierX = finalOutW / containerW;
    const multiplierY = finalOutH / containerH;

    const drawX = imgLeftInContainer * multiplierX;
    const drawY = imgTopInContainer * multiplierY;
    const drawW = displayedW * multiplierX;
    const drawH = displayedH * multiplierY;

    const originalImg = new Image();
    originalImg.crossOrigin = 'anonymous';
    originalImg.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(originalImg, drawX, drawY, drawW, drawH);
      try {
        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.82);
        onCropComplete(croppedBase64);
      } catch (err) {
        console.error('Canvas export error:', err);
        onCropComplete(imageSrc);
      }
    };
    originalImg.onerror = () => {
      onCropComplete(imageSrc);
    };
    originalImg.src = imageSrc;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#12151f] border border-[#2e364c] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222838] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#c5a059]/10 text-[#c5a059]">
              <Move className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">
                {title || (activeRatio >= 1.2 ? 'Sesuaikan Foto Proyek (16:9)' : 'Sesuaikan Foto (Crop & Zoom)')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {description || 'Atur zoom & geser posisi gambar agar pas di frame'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ratio Selector (If allowed) */}
        {allowRatioChange && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#171b26] rounded-xl border border-[#232a3d]">
            <span className="text-[11px] text-slate-400 font-mono-code font-bold">Rasio Frame:</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setActiveRatio(16 / 9);
                  setPosition({ x: 0, y: 0 });
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono-code transition-all ${
                  Math.abs(activeRatio - 16 / 9) < 0.05
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'bg-[#202636] text-slate-300 hover:bg-[#2b3346]'
                }`}
              >
                16:9 (Lanskap)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRatio(4 / 3);
                  setPosition({ x: 0, y: 0 });
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono-code transition-all ${
                  Math.abs(activeRatio - 4 / 3) < 0.05
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'bg-[#202636] text-slate-300 hover:bg-[#2b3346]'
                }`}
              >
                4:3
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRatio(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono-code transition-all ${
                  Math.abs(activeRatio - 1) < 0.05
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'bg-[#202636] text-slate-300 hover:bg-[#2b3346]'
                }`}
              >
                1:1
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveRatio(9 / 16);
                  setPosition({ x: 0, y: 0 });
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono-code transition-all ${
                  Math.abs(activeRatio - 9 / 16) < 0.05
                    ? 'bg-[#c5a059] text-black font-bold'
                    : 'bg-[#202636] text-slate-300 hover:bg-[#2b3346]'
                }`}
              >
                9:16
              </button>
            </div>
          </div>
        )}

        {/* 9:16 Viewport Canvas */}
        <div className="relative flex items-center justify-center py-1">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            style={{ width: `${containerW}px`, height: `${containerH}px` }}
            className="rounded-2xl bg-[#0b0d14] border-2 border-[#c5a059]/80 overflow-hidden relative shadow-inner cursor-grab active:cursor-grabbing select-none flex items-center justify-center"
          >
            {/* Background Grid Lines for Rule of Thirds */}
            <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 opacity-25">
              <div className="border-r border-b border-[#c5a059]" />
              <div className="border-r border-b border-[#c5a059]" />
              <div className="border-b border-[#c5a059]" />
              <div className="border-r border-b border-[#c5a059]" />
              <div className="border-r border-b border-[#c5a059]" />
              <div className="border-b border-[#c5a059]" />
              <div className="border-r border-b border-[#c5a059]" />
              <div className="border-r border-b border-[#c5a059]" />
              <div />
            </div>

            {/* Target Image with strict natural ratio */}
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                draggable={false}
                style={{
                  width: `${baseSize.width * scale}px`,
                  height: `${baseSize.height * scale}px`,
                  transform: `translate(${position.x}px, ${position.y}px)`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                }}
                className="pointer-events-none transition-transform duration-75 select-none"
              />
            )}

            {/* Hint overlay */}
            <div className="absolute bottom-2 left-2 right-2 pointer-events-none z-20 flex justify-center">
              <span className="bg-black/75 text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/10 font-mono-code">
                Tahan & geser untuk atur posisi
              </span>
            </div>
          </div>
        </div>

        {/* Zoom & Fit Controls */}
        <div className="space-y-3 bg-[#171b26] p-3 rounded-xl border border-[#232a3d]">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScale((prev) => Math.max(0.3, Number((prev - 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg bg-[#202636] hover:bg-[#c5a059] text-slate-300 hover:text-black transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min="0.3"
              max="3"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-[#c5a059] h-1.5 bg-[#252c3e] rounded-lg cursor-pointer"
            />
            <button
              onClick={() => setScale((prev) => Math.min(3, Number((prev + 0.1).toFixed(2))))}
              className="p-1.5 rounded-lg bg-[#202636] hover:bg-[#c5a059] text-slate-300 hover:text-black transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setScale(1);
                setPosition({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded-lg bg-[#202636] hover:bg-[#c5a059] text-slate-300 hover:text-black transition-colors"
              title="Reset Zoom & Posisi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fit vs Cover Mode Toggle */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#232a3d]">
            <span className="text-slate-400 text-[11px]">Mode Proporsi:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFitMode('cover');
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono-code font-bold transition-all ${
                  fitMode === 'cover'
                    ? 'bg-[#c5a059] text-black shadow-sm'
                    : 'bg-[#202636] text-slate-300 hover:bg-[#2c344a]'
                }`}
              >
                Penuh (Cover)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFitMode('contain');
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono-code font-bold transition-all flex items-center gap-1 ${
                  fitMode === 'contain'
                    ? 'bg-[#c5a059] text-black shadow-sm'
                    : 'bg-[#202636] text-slate-300 hover:bg-[#2c344a]'
                }`}
              >
                <Maximize2 className="w-3 h-3" />
                Muat Semua (Fit)
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-mono-code text-xs font-bold transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] via-[#c5a059] to-[#aa8038] text-black font-mono-code text-xs font-black shadow-[0_4px_15px_rgba(197,160,89,0.3)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Terapkan & Simpan Crop</span>
          </button>
        </div>
      </div>
    </div>
  );
};
