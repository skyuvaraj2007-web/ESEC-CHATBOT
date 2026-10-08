'use client';

import React from 'react';
import Link from 'next/link';
import {
  Eye,
  Sparkles,
  ArrowRight,
  Layers,
  Zap,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Scale,
  Camera,
  Activity,
  Cpu,
  HelpCircle,
  Languages
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080B14] text-[#F8FAFC] flex flex-col selection:bg-[#8B5CF6]/30">
      {/* Navigation Bar */}
      <header className="h-16 sm:h-20 border-b border-white/[0.08] px-4 sm:px-6 lg:px-12 flex items-center justify-between sticky top-0 bg-[#080B14]/80 backdrop-blur-xl z-50">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#8B5CF6] to-[#22D3EE] p-0.5 shadow-xl shadow-[#8B5CF6]/25 shrink-0">
            <div className="w-full h-full bg-[#080B14] rounded-[10px] flex items-center justify-center">
              <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-[#22D3EE]" />
            </div>
          </div>
          <span className="font-bold text-base sm:text-lg tracking-wider text-white">
            VISION<span className="text-[#8B5CF6]">AI</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-[#94A3B8]">
          <a href="#features" className="hover:text-white transition">Capabilities</a>
          <a href="#demo" className="hover:text-white transition">Adaptive Pipeline</a>
          <a href="#architecture" className="hover:text-white transition">Architecture</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            href="/login"
            className="text-xs font-medium text-[#94A3B8] hover:text-white transition px-2.5 sm:px-3 py-2 min-h-[44px] inline-flex items-center"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="btn-primary px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 min-h-[44px]"
          >
            <span>Start Exploring</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-12 pt-10 sm:pt-20 pb-16 sm:pb-28 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Glow Halo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[600px] h-[200px] sm:h-[350px] bg-[#8B5CF6]/15 blur-[100px] sm:blur-[120px] rounded-full pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-[11px] sm:text-xs font-medium text-[#D0BCFF] mb-6 sm:mb-8 backdrop-blur-md max-w-[90vw] truncate">
          <Sparkles className="w-3.5 h-3.5 text-[#22D3EE] shrink-0" />
          <span className="truncate">Adaptive Multimodal Visual-AI Platform</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.15] sm:leading-[1.1] mb-4 sm:mb-6">
          See. Ask. <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D0BCFF] via-[#22D3EE] to-[#34D399]">
            Understand Automatically.
          </span>
        </h1>

        <p className="text-xs sm:text-base text-[#94A3B8] max-w-2xl leading-relaxed mb-8 sm:mb-10 px-2">
          Upload an image. VISIONAI understands it automatically without requiring a question. Then ask anything about what you see with conversational context, multilingual interaction, and optional specialized visual analytics.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
          <Link
            href="/signup"
            className="w-full sm:w-auto btn-primary px-8 py-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 shadow-xl shadow-[#8B5CF6]/30 group min-h-[44px]"
          >
            <span>Launch Visual Workspace</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto btn-secondary px-7 py-3.5 rounded-xl text-xs sm:text-sm font-medium text-white/90 hover:text-white justify-center min-h-[44px]"
          >
            Explore Live Demo
          </Link>
        </div>

        {/* Interactive Workspace Preview Mockup */}
        <div id="demo" className="mt-16 w-full max-w-5xl rounded-2xl glass-panel p-2.5 border border-white/15 shadow-2xl shadow-black/90 overflow-hidden relative">
          <div className="bg-[#080B14] rounded-xl border border-white/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
            {/* Left Chat Thread Mock */}
            <div className="lg:col-span-7 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/10 text-left space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#8B5CF6]">
                    <Sparkles className="w-4 h-4" />
                    <span>AUTOMATIC MULTIMODAL OVERVIEW</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#8B5CF6]/20 text-[#D0BCFF] font-mono">
                    ✓ Gemini Vision
                  </span>
                </div>

                <div className="p-4 glass-card rounded-xl border border-[#8B5CF6]/30 space-y-2 text-xs">
                  <div className="font-semibold text-white">Image Overview</div>
                  <p className="text-[#F8FAFC] leading-relaxed">
                    This image shows a modern robotics workshop with autonomous navigation rovers and engineering telemetry screens under bright indoor lighting.
                  </p>
                  <div className="pt-2 border-t border-white/5 space-y-1">
                    <span className="text-[11px] font-semibold text-[#22D3EE]">Key Details:</span>
                    <ul className="text-[11px] text-[#94A3B8] space-y-0.5 list-disc pl-4">
                      <li>Autonomous mobile base visible on left workbench</li>
                      <li>Diagnostic screens displaying LiDAR point cloud telemetry</li>
                      <li>Standard workshop safety signs clearly readable</li>
                    </ul>
                  </div>
                </div>

                {/* Suggested Questions */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wider">Suggested Questions:</span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-[#D0BCFF]">
                      What models are supported?
                    </span>
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-[#D0BCFF]">
                      Explain in Tamil
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/[0.03] rounded-xl border border-white/5 flex items-center justify-between text-xs text-[#64748B]">
                <span className="flex items-center gap-1.5 text-[#34D399]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Automatic Understanding Active</span>
                </span>
                <span className="font-mono text-[10px]">Zero Extra Prompts Required</span>
              </div>
            </div>

            {/* Right Architecture Mock */}
            <div className="lg:col-span-5 p-6 bg-[#051424] text-left flex flex-col justify-between space-y-4" id="architecture">
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#22D3EE] flex items-center gap-1.5">
                  <Cpu className="w-4 h-4" />
                  <span>Adaptive AI Architecture</span>
                </div>

                <div className="space-y-2">
                  <div className="p-3 bg-[#080B14] rounded-xl border border-[#8B5CF6]/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">Primary Multimodal AI</span>
                      <span className="text-[10px] text-[#34D399] font-mono">Always Active</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8]">
                      Gemini Flash: Scene understanding, text reading, conversational context, Tanglish.
                    </p>
                  </div>

                  <div className="p-3 bg-[#080B14] rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#22D3EE]">Specialized YOLO Module</span>
                      <span className="text-[10px] text-[#94A3B8] font-mono">On-Demand</span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Executed only when bounding boxes, object counting, or spatial tracking are asked.
                    </p>
                  </div>

                  <div className="p-3 bg-[#080B14] rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#34D399]">Specialized OCR Module</span>
                      <span className="text-[10px] text-[#94A3B8] font-mono">On-Demand</span>
                    </div>
                    <p className="text-[11px] text-[#64748B]">
                      Executed only when exact verbatim text or dense document tables are requested.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-[#080B14] rounded-lg border border-white/5 flex items-center justify-between text-[11px] text-[#94A3B8]">
                <span>Pipeline Efficiency</span>
                <span className="font-mono font-bold text-[#34D399]">Task-Driven (No redundant compute)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 px-6 lg:px-12 max-w-7xl mx-auto border-t border-white/[0.08]">
        <div className="text-center space-y-3 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8B5CF6]">Platform Capabilities</h2>
          <p className="text-2xl sm:text-4xl font-bold text-white">Full-Stack Visual Intelligence Engine</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-[#8B5CF6]/40 transition">
            <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/15 flex items-center justify-center text-[#8B5CF6]">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Automatic Image Description</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Instant visual overview and key scene details generated automatically as soon as an image is uploaded.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-[#22D3EE]/40 transition">
            <div className="w-10 h-10 rounded-xl bg-[#22D3EE]/15 flex items-center justify-center text-[#22D3EE]">
              <Languages className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Multilingual & Tanglish</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Conversational reasoning across Tamil, Tanglish, Hindi, Malayalam, Telugu, and English with full context.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-[#34D399]/40 transition">
            <div className="w-10 h-10 rounded-xl bg-[#34D399]/15 flex items-center justify-center text-[#34D399]">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">On-Demand YOLO Analytics</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Specialized fast bounding box isolation and object counting when precise spatial localization is needed.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-white/20 transition">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Live Camera Capture</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Direct webcam & device camera integration with interactive HUD viewfinder and targeting reticle.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-white/20 transition">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Side-by-Side Comparison</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Compare any two visual assets to pinpoint subtle differences, layout shifts, or structural alterations.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-3 hover:border-white/20 transition">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Supabase PostgreSQL & Auth</h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Enterprise security with JWT validation, persistent conversational memory, and encrypted storage.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/[0.08] py-8 px-6 lg:px-12 text-center text-xs text-[#64748B]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-[#8B5CF6]" />
          <span className="font-bold text-white">VISIONAI</span>
        </div>
        <p>© 2026 VISIONAI Platform. See. Ask. Understand.</p>
      </footer>
    </div>
  );
}
