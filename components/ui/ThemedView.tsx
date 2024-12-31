import { View, ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export function ThemedView(props: ViewProps) {
  const backgroundColor = useThemeColor('background');
  return <View style={[{ backgroundColor }, props.style]} {...props} />;
} 