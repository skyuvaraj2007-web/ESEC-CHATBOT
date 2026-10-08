'use client';

import React, { useState } from 'react';
import { Settings as SettingsIcon, Cpu, Sliders, ShieldCheck, Database, Save, Check } from 'lucide-react';

export default function SettingsPage() {
  const [model, setModel] = useState('gemini-1.5-flash');
  const [enableYolo, setEnableYolo] = useState(true);
  const [enableOcr, setEnableOcr] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#080B14] p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto space-y-1">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8B5CF6]">
          <SettingsIcon className="w-4 h-4" />
          <span>PREFERENCES & ENGINE PIPELINE</span>
        </div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">System Settings</h1>
        <p className="text-xs text-[#94A3B8]">Configure multimodal model pipelines, object detection models, and OCR parameters</p>
      </div>

      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSave} className="space-y-6">
          {/* AI Multimodal Model */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#8B5CF6]" />
              <h3 className="text-sm font-bold text-white">Primary Multimodal Intelligence</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                  model === 'gemini-1.5-flash'
                    ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                    : 'bg-[#051424] border-white/10 text-[#94A3B8] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">Gemini 1.5 Flash</span>
                  <input
                    type="radio"
                    name="model"
                    value="gemini-1.5-flash"
                    checked={model === 'gemini-1.5-flash'}
                    onChange={(e) => setModel(e.target.value)}
                    className="accent-[#8B5CF6]"
                  />
                </div>
                <p className="text-[11px] leading-relaxed">
                  Recommended. Low latency multimodal reasoning for real-time visual conversation.
                </p>
              </label>

              <label
                className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                  model === 'gemini-1.5-pro'
                    ? 'bg-[#8B5CF6]/15 border-[#8B5CF6] text-white'
                    : 'bg-[#051424] border-white/10 text-[#94A3B8] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white">Gemini 1.5 Pro</span>
                  <input
                    type="radio"
                    name="model"
                    value="gemini-1.5-pro"
                    checked={model === 'gemini-1.5-pro'}
                    onChange={(e) => setModel(e.target.value)}
                    className="accent-[#8B5CF6]"
                  />
                </div>
                <p className="text-[11px] leading-relaxed">
                  High complexity multimodal deep reasoning for intricate diagrams and scientific imagery.
                </p>
              </label>
            </div>
          </div>

          {/* Vision Pipeline Toggles */}
          <div className="glass-panel rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#22D3EE]" />
              <h3 className="text-sm font-bold text-white">Vision Pipeline Submodules</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-[#051424] rounded-xl border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">YOLO Object Detection</div>
                  <div className="text-[11px] text-[#94A3B8]">
                    Isolate bounding boxes, class labels, and confidence tags on visual uploads.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableYolo}
                  onChange={(e) => setEnableYolo(e.target.checked)}
                  className="w-4 h-4 accent-[#22D3EE]"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#051424] rounded-xl border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">Optical Character Recognition (OCR)</div>
                  <div className="text-[11px] text-[#94A3B8]">
                    Automatically extract embedded text, road signs, and typography into structured telemetry.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableOcr}
                  onChange={(e) => setEnableOcr(e.target.checked)}
                  className="w-4 h-4 accent-[#34D399]"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="text-xs text-[#34D399] flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Settings Saved</span>
              </span>
            )}

            <button
              type="submit"
              className="btn-primary px-6 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
