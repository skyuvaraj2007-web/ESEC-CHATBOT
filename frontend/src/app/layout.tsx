import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { CapacitorInitializer } from '@/components/CapacitorInitializer';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#080B14',
};

export const metadata: Metadata = {
  title: 'VISIONAI — See. Ask. Understand.',
  description: 'Enterprise multimodal visual intelligence platform. Conversational image reasoning, real-time object detection, OCR, and comparative telemetry.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VISIONAI',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className="min-h-screen bg-[#080B14] text-[#F8FAFC] antialiased selection:bg-[#8B5CF6]/30 selection:text-[#FFFFFF]">
        <Suspense fallback={null}>
          <AuthProvider>
            <CapacitorInitializer />
            {children}
          </AuthProvider>
        </Suspense>
      </body>
    </html>
  );
}
