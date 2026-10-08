'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DetectedObject, SelectedRegion, SelectedObjectContext } from '@/types';
import {
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
  FileText,
  Palette,
  Crosshair,
  X,
  Compass,
  Maximize2
} from 'lucide-react';

interface ObjectOverlayProps {
  imageUrl: string;
  objects?: DetectedObject[];
  alt?: string;
  className?: string;
  showToggle?: boolean;
  selectedRegion?: SelectedRegion | null;
  selectedObject?: SelectedObjectContext | null;
  onSelectRegion?: (region: SelectedRegion, object?: SelectedObjectContext) => void;
  onClearRegion?: () => void;
  onActionClick?: (actionType: string, defaultQuery: string) => void;
}

export const ObjectOverlay: React.FC<ObjectOverlayProps> = ({
  imageUrl,
  objects = [],
  alt = 'Visual input',
  className = '',
  showToggle = true,
  selectedRegion,
  selectedObject,
  onSelectRegion,
  onClearRegion,
  onActionClick,
}) => {
  const [showBoxes, setShowBoxes] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDrag, setCurrentDrag] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const boxesWithCoords = objects.filter((o) => o.box && o.box.x_min !== undefined);

  // Helper to convert mouse/touch event coordinates into image percentage (0-100%)
  const getCoordinatesFromEvent = useCallback((e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    const xPercent = Math.max(0, Math.min(100, (relX / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, (relY / rect.height) * 100));

    return { x: xPercent, y: yPercent };
  }, []);

  // Handle Drag / Draw Selection Start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    const coords = getCoordinatesFromEvent(e);
    if (!coords) return;

    setIsDragging(true);
    setDragStart(coords);
    setCurrentDrag({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const coords = getCoordinatesFromEvent(e);
    if (!coords) return;

    setIsDragging(true);
    setDragStart(coords);
    setCurrentDrag({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  // Handle Drag Move
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragStart) return;
      const coords = getCoordinatesFromEvent(e);
      if (!coords) return;

      const minX = Math.min(dragStart.x, coords.x);
      const minY = Math.min(dragStart.y, coords.y);
      const width = Math.abs(coords.x - dragStart.x);
      const height = Math.abs(coords.y - dragStart.y);

      setCurrentDrag({ x: minX, y: minY, width, height });
    };

    const handleEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);

      if (currentDrag) {
        // If dragged a sensible box (> 4% width/height), commit as custom region
        if (currentDrag.width >= 4 && currentDrag.height >= 4) {
          if (onSelectRegion) {
            onSelectRegion({
              x: Math.round(currentDrag.x * 10) / 10,
              y: Math.round(currentDrag.y * 10) / 10,
              width: Math.round(currentDrag.width * 10) / 10,
              height: Math.round(currentDrag.height * 10) / 10,
              unit: 'percent',
            });
          }
        } else if (dragStart) {
          // If just clicked/tapped without dragging, generate a focused 22x22% bounding box centered around the click
          const boxSize = 22;
          const left = Math.max(0, Math.min(100 - boxSize, dragStart.x - boxSize / 2));
          const top = Math.max(0, Math.min(100 - boxSize, dragStart.y - boxSize / 2));
          if (onSelectRegion) {
            onSelectRegion({
              x: Math.round(left * 10) / 10,
              y: Math.round(top * 10) / 10,
              width: boxSize,
              height: boxSize,
              unit: 'percent',
            });
          }
        }
      }

      setDragStart(null);
      setCurrentDrag(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragStart, currentDrag, getCoordinatesFromEvent, onSelectRegion]);

  // Handle Clicking on a Detected YOLO Object
  const handleObjectClick = (e: React.MouseEvent, obj: DetectedObject) => {
    e.stopPropagation();
    if (!obj.box) return;

    const width = obj.box.x_max - obj.box.x_min;
    const height = obj.box.y_max - obj.box.y_min;

    if (onSelectRegion) {
      onSelectRegion(
        {
          x: obj.box.x_min,
          y: obj.box.y_min,
          width: width,
          height: height,
          unit: 'percent',
        },
        {
          label: obj.name,
          confidence: obj.confidence,
          bbox: [obj.box.x_min, obj.box.y_min, obj.box.x_max, obj.box.y_max],
        }
      );
    }
  };

  const handleAction = (type: string, query: string) => {
    if (onActionClick) {
      onActionClick(type, query);
    }
  };

  const activeRegion = currentDrag || selectedRegion;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`relative rounded-xl overflow-hidden group border border-white/10 bg-[#051424] select-none cursor-crosshair ${className}`}
      title="Click or drag to select any object/region of interest"
    >
      {/* Background Image */}
      <img
        ref={imgRef}
        src={imageUrl}
        alt={alt}
        className="w-full h-auto max-h-[420px] object-contain rounded-xl block mx-auto pointer-events-none"
      />

      {/* Crosshair Corner Reticles */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#8B5CF6]/70 pointer-events-none" />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#8B5CF6]/70 pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#8B5CF6]/70 pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#8B5CF6]/70 pointer-events-none" />

      {/* Selection Helper Tooltip on Image */}
      {!selectedRegion && !isDragging && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[#080B14]/85 backdrop-blur-md border border-white/10 text-[10px] text-[#94A3B8] pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 shadow-lg">
          <Crosshair className="w-3 h-3 text-[#22D3EE]" />
          <span>Click or drag to select an object</span>
        </div>
      )}

      {/* Pre-Detected YOLO Bounding Boxes */}
      {showBoxes &&
        boxesWithCoords.map((obj, idx) => {
          const box = obj.box!;
          const width = box.x_max - box.x_min;
          const height = box.y_max - box.y_min;
          const isHovered = hoveredIndex === idx;
          const isThisSelected =
            selectedObject?.label?.toLowerCase() === obj.name.toLowerCase() &&
            selectedRegion &&
            Math.abs(selectedRegion.x - box.x_min) < 2;

          return (
            <div
              key={idx}
              onClick={(e) => handleObjectClick(e, obj)}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{
                left: `${box.x_min}%`,
                top: `${box.y_min}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
              className={`absolute border transition-all duration-200 cursor-pointer pointer-events-auto ${
                isThisSelected
                  ? 'border-[#8B5CF6] bg-[#8B5CF6]/25 shadow-[0_0_20px_rgba(139,92,246,0.6)] z-20'
                  : isHovered
                  ? 'border-[#22D3EE] bg-[#22D3EE]/20 shadow-[0_0_15px_rgba(34,211,238,0.5)] z-15'
                  : 'border-[#22D3EE]/60 bg-[#22D3EE]/10 shadow-[0_0_6px_rgba(34,211,238,0.2)] z-10'
              }`}
            >
              {/* Tag Label */}
              <div className="absolute -top-6 left-0 flex items-center gap-1 px-1.5 py-0.5 bg-[#080B14]/90 border border-[#22D3EE]/60 rounded text-[10px] font-mono text-[#22D3EE] whitespace-nowrap shadow-md">
                <span className="font-semibold capitalize">{obj.name}</span>
                <span className="text-[#94A3B8]">{Math.round(obj.confidence * 100)}%</span>
              </div>
            </div>
          );
        })}

      {/* Active Selected Region Overlay */}
      {activeRegion && (
        <div
          style={{
            left: `${activeRegion.x}%`,
            top: `${activeRegion.y}%`,
            width: `${activeRegion.width}%`,
            height: `${activeRegion.height}%`,
          }}
          className="absolute border-2 border-[#8B5CF6] bg-[#8B5CF6]/20 shadow-[0_0_20px_rgba(139,92,246,0.5)] rounded-lg pointer-events-none z-30 animate-in fade-in"
        >
          {/* Corner Target Handles */}
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#D0BCFF] rounded-sm shadow-md" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#D0BCFF] rounded-sm shadow-md" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-[#D0BCFF] rounded-sm shadow-md" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#D0BCFF] rounded-sm shadow-md" />

          {/* Region Label Badge */}
          <div className="absolute -top-6 left-0 px-2 py-0.5 bg-[#080B14]/95 border border-[#8B5CF6] rounded text-[10px] font-mono text-[#D0BCFF] flex items-center gap-1 shadow-xl whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-ping" />
            <span className="font-semibold">
              {selectedObject?.label ? `Selected: ${selectedObject.label}` : 'Selected Object'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Contextual Action Dock for Selected Region */}
      {selectedRegion && !isDragging && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2.5 inset-x-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 p-1.5 rounded-2xl bg-[#080B14]/95 border border-[#8B5CF6]/50 shadow-2xl shadow-black backdrop-blur-xl z-40 flex items-center justify-center gap-1.5 overflow-x-auto max-w-full animate-in fade-in zoom-in-95"
        >
          <button
            type="button"
            onClick={() => handleAction('ask', 'What is this selected object and what are its key details?')}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-[#8B5CF6]/25 hover:brightness-110 transition whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Ask About This</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('describe', 'Describe this selected object and what is happening here in detail.')}
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#D0BCFF] hover:text-white border border-white/10 transition whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <span>Describe</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('color', 'What color is this selected object?')}
            className="px-2 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#D0BCFF] hover:text-white border border-white/10 transition whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <Palette className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Color</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('text', 'Is there any readable text, letters, or numbers in this selected region?')}
            className="px-2 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-[#D0BCFF] hover:text-white border border-white/10 transition whitespace-nowrap shrink-0 flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5 text-[#34D399]" />
            <span>Read Text</span>
          </button>

          {onClearRegion && (
            <button
              type="button"
              onClick={onClearRegion}
              title="Clear Selection"
              className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-red-500/20 text-[#94A3B8] hover:text-red-300 border border-white/10 transition shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* YOLO Toggle Button */}
      {showToggle && boxesWithCoords.length > 0 && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200 z-35">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowBoxes(!showBoxes);
            }}
            className="p-1.5 rounded-lg bg-[#080B14]/85 backdrop-blur-md border border-white/10 text-xs text-[#94A3B8] hover:text-white transition flex items-center gap-1 min-h-[34px]"
            title={showBoxes ? 'Hide Bounding Boxes' : 'Show Bounding Boxes'}
          >
            {showBoxes ? <Eye className="w-3.5 h-3.5 text-[#22D3EE]" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[11px] pr-1">{boxesWithCoords.length} detected</span>
          </button>
        </div>
      )}
    </div>
  );
};

