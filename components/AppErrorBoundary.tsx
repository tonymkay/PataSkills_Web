/**
 * Top-level crash net. Without this, any uncaught render/effect error
 * anywhere in the tree unmounts the ENTIRE app on web — leaving a plain
 * black page (the HTML background) with no text, no button, nothing to
 * screenshot but a blank screen. This turns that into a visible, recoverable
 * error screen and (critically) surfaces the actual error message so it's
 * diagnosable instead of silent.
 */
import { Component, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // eslint-disable-next-line no-console
    console.error('[AppErrorBoundary] caught:', error, info?.componentStack);
  }

  private reset = () => {
    // On web, a full reload clears whatever bad state (stale timers,
    // subscriptions, etc.) caused the crash. Just resetting state can
    // leave the same broken effect chain in place and crash again
    // instantly. Native gets a soft reset since there's no page to reload.
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
      return;
    }
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={{ flex: 1, backgroundColor: '#0B0D12', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' }}>
          Something went wrong
        </Text>
        <Text style={{ color: '#B8BEC9', fontSize: 13, textAlign: 'center', maxWidth: 480 }} selectable>
          {error.message || String(error)}
        </Text>
        <Pressable
          onPress={this.reset}
          style={{ backgroundColor: '#2F80ED', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Go to home</Text>
        </Pressable>
      </View>
    );
  }
}
