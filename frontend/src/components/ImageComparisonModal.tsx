'use client';

import React, { useState } from 'react';
import { ImageModel, CompareResponseData } from '@/types';
import { Scale, X, Loader2, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface ImageComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableImages: ImageModel[];
  defaultImage1?: ImageModel | null;
}

export const ImageComparisonModal: React.FC<ImageComparisonModalProps> = ({
  isOpen,
  onClose,
  availableImages,
  defaultImage1,
}) => {
  const [image1Id, setImage1Id] = useState<string>(defaultImage1?.id || availableImages[0]?.id || '');
  const [image2Id, setImage2Id] = useState<string>(availableImages[1]?.id || availableImages[0]?.id || '');
  const [prompt, setPrompt] = useState('Compare these two images in detail and list their key visual similarities and differences.');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompareResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunCompare = async () => {
    if (!image1Id || !image2Id) {
      setError('Please select two distinct images to compare.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.compareImages({
        image_id_1: image1Id,
        image_id_2: image2Id,
        prompt,
      });
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Comparison failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const img1 = availableImages.find((i) => i.id === image1Id);
  const img2 = availableImages.find((i) => i.id === image2Id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#101522] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#22D3EE]" />
            <h3 className="text-sm font-semibold text-white">Comparative Visual Reasoning</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Side by Side Image Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image 1 Box */}
            <div className="glass-card rounded-xl p-3.5 border border-white/10 space-y-2">
              <label className="text-xs font-semibold text-[#8B5CF6] uppercase tracking-wider block">
                Primary Image
              </label>
              <select
                value={image1Id}
                onChange={(e) => setImage1Id(e.target.value)}
                className="w-full bg-[#080B14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8B5CF6]"
              >
                {availableImages.map((img) => (
                  <option key={img.id} value={img.id}>
                    {img.file_name} ({img.width}x{img.height})
                  </option>
                ))}
              </select>

              {img1 && (
                <div className="h-44 rounded-lg overflow-hidden bg-[#051424] border border-white/5">
                  <img src={img1.public_url} alt="Image 1" className="w-full h-full object-contain" />
                </div>
              )}
            </div>

            {/* Image 2 Box */}
            <div className="glass-card rounded-xl p-3.5 border border-white/10 space-y-2">
              <label className="text-xs font-semibold text-[#22D3EE] uppercase tracking-wider block">
                Comparative Image
              </label>
              <select
                value={image2Id}
                onChange={(e) => setImage2Id(e.target.value)}
                className="w-full bg-[#080B14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
              >
                {availableImages.map((img) => (
                  <option key={img.id} value={img.id}>
                    {img.file_name} ({img.width}x{img.height})
                  </option>
                ))}
              </select>

              {img2 && (
                <div className="h-44 rounded-lg overflow-hidden bg-[#051424] border border-white/5">
                  <img src={img2.public_url} alt="Image 2" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>

          {/* Comparison Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#94A3B8]">Comparison Focus</label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Compare architectural style, color distribution, and objects."
              className="w-full bg-[#080B14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#22D3EE]"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          {/* Results Display */}
          {result && (
            <div className="glass-panel rounded-xl p-5 border border-white/10 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#34D399]">
                <Sparkles className="w-4 h-4 text-[#34D399]" />
                <span>Multimodal Synthesis</span>
              </div>

              <p className="text-xs text-[#F8FAFC] leading-relaxed bg-[#080B14]/70 p-3.5 rounded-lg border border-white/5">
                {result.comparison}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-[#051424] rounded-lg border border-white/5 space-y-2">
                  <div className="text-[11px] font-semibold text-[#22D3EE] uppercase tracking-wider">
                    Similarities
                  </div>
                  <ul className="space-y-1 text-xs text-[#94A3B8]">
                    {result.similarities.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#22D3EE] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-[#051424] rounded-lg border border-white/5 space-y-2">
                  <div className="text-[11px] font-semibold text-[#8B5CF6] uppercase tracking-wider">
                    Key Differences
                  </div>
                  <ul className="space-y-1 text-xs text-[#94A3B8]">
                    {result.differences.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/[0.08] flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-[#94A3B8] hover:text-white px-3 py-2">
            Close
          </button>

          <button
            onClick={handleRunCompare}
            disabled={isLoading || availableImages.length < 2}
            className="btn-primary px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scale className="w-4 h-4" />}
            <span>Run Comparison</span>
          </button>
        </div>
      </div>
    </div>
  );
};
