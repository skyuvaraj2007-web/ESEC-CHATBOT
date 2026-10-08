'use client';

import React, { useState } from 'react';
import { ImageModel, ImageAnalysisData, SelectedRegion, SelectedObjectContext } from '@/types';
import {
  Sparkles,
  Layers,
  FileText,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Cpu,
  Zap,
  Scale,
  Crosshair,
  X,
  Target
} from 'lucide-react';
import { api } from '@/lib/api';

interface AnalysisPanelProps {
  activeImage?: ImageModel | null;
  onOpenCompare?: () => void;
  onReanalyze?: () => void;
  onClose?: () => void;
  selectedRegion?: SelectedRegion | null;
  selectedObject?: SelectedObjectContext | null;
  onClearRegion?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  activeImage,
  onOpenCompare,
  onReanalyze,
  onClose,
  selectedRegion,
  selectedObject,
  onClearRegion,
}) => {
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  const analysis: ImageAnalysisData | undefined = activeImage?.analysis || undefined;

  const handleCopyOcr = () => {
    if (analysis?.ocr_text) {
      navigator.clipboard.writeText(analysis.ocr_text);
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    }
  };

  const handleTriggerReanalyze = async () => {
    if (!activeImage) return;
    try {
      setIsReanalyzing(true);
      await api.analyzeImage(activeImage.id);
      if (onReanalyze) onReanalyze();
    } catch (e) {
      console.error(e);
    } finally {
      setIsReanalyzing(false);
    }
  };

  if (!activeImage) {
    return (
      <div className="w-full sm:w-96 lg:w-80 xl:w-96 border-l border-white/[0.08] bg-[#080B14] p-6 flex flex-col items-center justify-center text-center text-[#64748B] h-full shrink-0">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mb-3 text-[#94A3B8]">
          <Cpu className="w-6 h-6 text-[#8B5CF6]/70" />
        </div>
        <h3 className="text-sm font-semibold text-[#F8FAFC]">Visual Telemetry</h3>
        <p className="text-xs text-[#94A3B8] mt-1 max-w-[220px]">
          Upload or capture an image to inspect real-time object bounding, scene parsing, and OCR text extraction.
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-white border border-white/10 lg:hidden"
          >
            Close Panel
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full sm:w-96 lg:w-80 xl:w-96 border-l border-white/[0.08] bg-[#080B14] flex flex-col h-full overflow-y-auto shrink-0 pb-safe">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between sticky top-0 bg-[#080B14]/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Visual Intelligence</h2>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenCompare && (
            <button
              onClick={onOpenCompare}
              title="Compare Image"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#22D3EE] transition border border-white/5 text-xs flex items-center justify-center min-w-[36px] min-h-[36px]"
            >
              <Scale className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleTriggerReanalyze}
            disabled={isReanalyzing}
            title="Re-run Multi-Modal Pipeline"
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-[#8B5CF6] transition border border-white/5 min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${isReanalyzing ? 'animate-spin text-[#8B5CF6]' : ''}`} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Close Panel"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#94A3B8] hover:text-white transition border border-white/5 lg:hidden min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="Close Analysis"
            >
              <span className="text-base leading-none">✕</span>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Interactive Selection Focus Card */}
        {selectedRegion ? (
          <div className="glass-card rounded-xl p-3.5 border border-[#8B5CF6]/40 bg-gradient-to-br from-[#8B5CF6]/10 to-[#22D3EE]/5 shadow-[0_0_20px_rgba(139,92,246,0.15)] space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center">
                  <Target className="w-3.5 h-3.5 text-[#A78BFA] animate-pulse" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white uppercase tracking-wider">
                    {selectedObject?.label ? `Focus: ${selectedObject.label}` : 'Selected Region Focus'}
                  </div>
                  <div className="text-[10px] text-[#A78BFA]">Target Coordinates Active</div>
                </div>
              </div>
              {onClearRegion && (
                <button
                  onClick={onClearRegion}
                  title="Clear Selection"
                  className="p-1 rounded-md bg-white/5 hover:bg-red-500/20 text-[#94A3B8] hover:text-red-400 border border-white/10 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Coordinates Grid */}
            <div className="grid grid-cols-4 gap-1.5 p-2 bg-[#051424]/90 rounded-lg border border-[#8B5CF6]/20 text-center font-mono">
              <div>
                <div className="text-[9px] text-[#64748B]">X</div>
                <div className="text-[11px] font-bold text-[#A78BFA]">{Math.round(selectedRegion.x)}%</div>
              </div>
              <div>
                <div className="text-[9px] text-[#64748B]">Y</div>
                <div className="text-[11px] font-bold text-[#A78BFA]">{Math.round(selectedRegion.y)}%</div>
              </div>
              <div>
                <div className="text-[9px] text-[#64748B]">WIDTH</div>
                <div className="text-[11px] font-bold text-[#22D3EE]">{Math.round(selectedRegion.width)}%</div>
              </div>
              <div>
                <div className="text-[9px] text-[#64748B]">HEIGHT</div>
                <div className="text-[11px] font-bold text-[#22D3EE]">{Math.round(selectedRegion.height)}%</div>
              </div>
            </div>

            {/* Active Analysis Module Pipeline */}
            <div className="space-y-1 pt-1 text-[10px]">
              <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Pipeline Status</div>
              <div className="flex items-center justify-between text-[#F8FAFC]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-[#34D399]" />
                  Gemini Vision Multimodal
                </span>
                <span className="text-[#34D399] font-mono font-medium">Active ✓</span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 flex items-center justify-center text-[10px]">○</span>
                  YOLO Object Detection
                </span>
                <span className="font-mono">
                  {selectedObject ? 'Bound ✓' : 'Not required'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 flex items-center justify-center text-[10px]">○</span>
                  Optical OCR
                </span>
                <span className="font-mono">Not required</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Image Spec Card */}
        <div className="glass-card rounded-xl p-3 border border-white/10 space-y-2">
          <div className="relative rounded-lg overflow-hidden h-32 bg-[#051424] border border-white/5">
            <img
              src={activeImage.public_url}
              alt={activeImage.file_name}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-[#080B14]/80 backdrop-blur-md rounded text-[10px] font-mono text-[#22D3EE]">
              {activeImage.width}x{activeImage.height} px
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1">
            <span className="truncate max-w-[160px]">{activeImage.file_name}</span>
            <span className="font-mono text-[#64748B]">
              {activeImage.file_size ? `${(activeImage.file_size / 1024).toFixed(1)} KB` : 'Optimized'}
            </span>
          </div>
        </div>

        {/* Confidence Meter */}
        <div className="glass-card rounded-xl p-3.5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#94A3B8] flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#34D399]" />
              Confidence Rating
            </span>
            <span className="text-xs font-mono font-bold text-[#34D399]">
              {Math.round((analysis?.confidence || 0.92) * 100)}%
            </span>
          </div>

          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${(analysis?.confidence || 0.92) * 100}%` }}
              className="h-full bg-gradient-to-r from-[#8B5CF6] via-[#22D3EE] to-[#34D399] rounded-full transition-all duration-500"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#64748B]">
            <span>Model Calibration: Calibrated</span>
            <span>VLM + YOLO Fusion</span>
          </div>
        </div>

        {/* Scene Classification */}
        {analysis?.scene && (
          <div className="glass-card rounded-xl p-3.5 border border-white/10 space-y-1.5">
            <div className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Scene Classification
            </div>
            <p className="text-xs text-[#F8FAFC] leading-relaxed">
              {analysis.scene}
            </p>
          </div>
        )}

        {/* Detected Objects */}
        <div className="glass-card rounded-xl p-3.5 border border-white/10 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-[#22D3EE] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Detected Objects
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20">
              {analysis?.objects?.length || 0} Entities
            </span>
          </div>

          {analysis?.objects && analysis.objects.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {analysis.objects.map((obj, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1 bg-[#22D3EE]/10 border border-[#22D3EE]/25 rounded-md text-[11px] font-medium text-[#22D3EE] flex items-center gap-1"
                >
                  <span className="capitalize">{obj.name}</span>
                  <span className="text-[10px] text-[#94A3B8] font-mono">
                    {Math.round(obj.confidence * 100)}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#64748B] italic">No prominent objects isolated.</p>
          )}
        </div>

        {/* OCR Text Extraction */}
        <div className="glass-card rounded-xl p-3.5 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold text-[#34D399] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              OCR Text Extraction
            </div>
            {analysis?.ocr_text && (
              <button
                onClick={handleCopyOcr}
                className="text-[10px] text-[#94A3B8] hover:text-white flex items-center gap-1 transition"
              >
                {copiedOcr ? (
                  <>
                    <Check className="w-3 h-3 text-[#34D399]" />
                    <span className="text-[#34D399]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>

          {analysis?.ocr_text ? (
            <div className="p-2.5 bg-[#051424] rounded-lg border border-white/5 text-xs text-[#F8FAFC] font-mono leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
              {analysis.ocr_text}
            </div>
          ) : (
            <div className="p-2.5 bg-[#051424]/50 rounded-lg border border-white/5 text-xs text-[#64748B] italic">
              No readable text detected.
            </div>
          )}
        </div>

        {/* Pipeline Telemetry Matrix */}
        <div className="glass-card rounded-xl p-3 border border-white/10 space-y-2 text-[11px]">
          <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
            Adaptive Pipeline Architecture
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Primary Engine</span>
              <span className="text-white font-mono font-medium">Gemini 1.5 Flash</span>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Task Router</span>
              <span className="text-[#D0BCFF] font-mono">Dynamic Intent Router</span>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Spatial Analytics</span>
              <span className="text-[#22D3EE] font-mono">YOLOv8 (On-Demand)</span>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Verbatim OCR</span>
              <span className="text-[#34D399] font-mono">Optical OCR (On-Demand)</span>
            </div>
            <div className="flex items-center justify-between text-[#94A3B8]">
              <span>Storage & Auth</span>
              <span className="text-[#94A3B8] font-mono">Supabase PostgreSQL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
