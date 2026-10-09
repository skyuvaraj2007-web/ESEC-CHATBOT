import type { CapacitorConfig } from '@capacitor/cli';

/**
 * VISIONAI Capacitor Configuration
 * 
 * Target: Android Native Shell for VISIONAI
 * Deployed Production Frontend: https://esec-chatbot.vercel.app
 * Live FastAPI Backend API: Configured via NEXT_PUBLIC_BACKEND_URL
 */
const config: CapacitorConfig = {
  appId: 'com.visionai.app',
  appName: 'VISIONAI',
  webDir: 'public',
  server: {
    // Verified production Vercel frontend URL
    url: process.env.CAPACITOR_SERVER_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://esec-chatbot.vercel.app',
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#080B14',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#080B14',
    },
  },
};

export default config;
