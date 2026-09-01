import React from 'react';
import { View } from 'react-native';

interface GoogleWebButtonProps {
  onIdToken: (idToken: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export function GoogleWebButton(_props: GoogleWebButtonProps) {
  return <View />;
}
