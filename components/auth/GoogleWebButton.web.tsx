import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';

declare global {
  interface Window {
    google?: any;
  }
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById('gis-client') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.id = 'gis-client';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
}

interface GoogleWebButtonProps {
  onIdToken: (idToken: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function GoogleWebButton({
  onIdToken,
  onError,
  disabled = false,
}: GoogleWebButtonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onIdTokenRef = useRef(onIdToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onIdTokenRef.current = onIdToken;
    onErrorRef.current = onError;
  }, [onIdToken, onError]);

  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  const [loadError, setLoadError] = useState<string | null>(null);
  // GIS's renderButton only accepts a fixed pixel width, not '100%' — a
  // hardcoded 320 overflowed the modal card on narrow phones (card content
  // width there is ~280px after padding), spilling the pill past the
  // card's rounded edges. Measure the wrapper's actual width instead and
  // re-render whenever it changes (orientation change, resize, etc.),
  // capped at 320 so it doesn't look oversized on wider screens.
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const update = () => setButtonWidth(Math.floor(el.getBoundingClientRect().width));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!clientId) {
      onErrorRef.current?.('Google sign-in is not configured');
      return;
    }
    if (!buttonWidth) return;

    let cancelled = false;
    (async () => {
      try {
        await loadGis();
      } catch {
        setLoadError('Could not load Google');
        onErrorRef.current?.('Could not load Google');
        return;
      }
      if (cancelled || !window.google) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response?.credential) {
            onIdTokenRef.current(response.credential);
          }
        },
      });

      if (ref.current) {
        ref.current.innerHTML = '';
        window.google.accounts.id.renderButton(ref.current, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: Math.min(buttonWidth, 320),
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId, buttonWidth]);

  if (!clientId || loadError) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <div
        ref={ref}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: disabled ? 'none' : 'auto',
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
});
