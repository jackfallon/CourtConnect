import { Text, TextProps } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ThemedTextProps extends TextProps {
  type?: 'default' | 'defaultSemiBold' | 'title' | 'subtitle' | 'link';
}

export function ThemedText({ style, type = 'default', ...props }: ThemedTextProps) {
  const color = useThemeColor('text');
  const tintColor = useThemeColor('tint');

  const getFontStyle = () => {
    switch (type) {
      case 'title':
        return { fontSize: 24, fontWeight: '600' as const };
      case 'subtitle':
        return { fontSize: 18, fontWeight: '600' as const };
      case 'defaultSemiBold':
        return { fontSize: 16, fontWeight: '600' as const };
      case 'link':
        return { fontSize: 16, fontWeight: '600' as const, color: tintColor };
      default:
        return { fontSize: 16, fontWeight: '400' as const };
    }
  };

  return <Text style={[{ color }, getFontStyle(), style]} {...props} />;
} 