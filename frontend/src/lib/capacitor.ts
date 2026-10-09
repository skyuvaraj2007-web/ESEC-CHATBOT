'use client';

import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Network, ConnectionStatus } from '@capacitor/network';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Checks if the application is running inside a native Capacitor shell (Android / iOS).
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Initializes native Android device integrations:
 * - Immersive dark status bar
 * - Hiding splash screen once UI is hydrated
 * - Hardware Back Button navigation handling
 */
export const initCapacitorBridge = (onNavigateBack?: () => boolean | void) => {
  if (!isNativePlatform()) return;

  // 1. Status Bar styling
  try {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: '#080B14' });
    StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    console.debug('StatusBar configuration error (non-fatal):', err);
  }

  // 2. Hide Splash Screen cleanly
  try {
    SplashScreen.hide();
  } catch (err) {
    console.debug('SplashScreen hide error (non-fatal):', err);
  }

  // 3. Android Hardware Back Button Handler
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      // If custom back navigation handled in app, use it
      if (onNavigateBack) {
        const handled = onNavigateBack();
        if (handled) return;
      }

      // Check browser history state
      if (window.history.length > 1 && window.location.pathname !== '/' && window.location.pathname !== '/app') {
        window.history.back();
      } else {
        // Exit / minimize app at root
        CapApp.minimizeApp();
      }
    });
  } catch (err) {
    console.debug('BackButton listener error (non-fatal):', err);
  }
};

/**
 * Subscribes to real-time network status changes using Capacitor Network plugin.
 */
export const subscribeToNetworkStatus = (
  callback: (status: ConnectionStatus) => void
): (() => void) => {
  if (!isNativePlatform()) {
    const handleOnline = () => callback({ connected: true, connectionType: 'wifi' });
    const handleOffline = () => callback({ connected: false, connectionType: 'none' });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }

  let handler: any = null;
  Network.addListener('networkStatusChange', callback).then((h) => {
    handler = h;
  });

  return () => {
    if (handler && typeof handler.remove === 'function') {
      handler.remove();
    }
  };
};

/**
 * Native Camera capture wrapper utilizing Capacitor Camera plugin with fallback support.
 */
export const captureNativePhoto = async (): Promise<{ file: File; previewUrl: string } | null> => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
    });

    if (!image.webPath) return null;

    const response = await fetch(image.webPath);
    const blob = await response.blob();
    const file = new File([blob], `capture-${Date.now()}.${image.format || 'jpg'}`, {
      type: `image/${image.format || 'jpeg'}`,
    });

    return {
      file,
      previewUrl: image.webPath,
    };
  } catch (err: any) {
    // User cancelled or permission denied
    if (err.message?.includes('cancelled') || err.message?.includes('canceled')) {
      return null;
    }
    console.warn('Native camera capture error, falling back:', err);
    throw err;
  }
};
