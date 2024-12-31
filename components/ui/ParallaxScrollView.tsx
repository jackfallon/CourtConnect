import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ParallaxScrollViewProps {
  children: ReactNode;
  headerImage?: ReactNode;
  headerBackgroundColor?: {
    light: string;
    dark: string;
  };
}

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: ParallaxScrollViewProps) {
  const backgroundColor = useThemeColor('background');
  const colorScheme = useColorScheme();
  const headerBgColor = headerBackgroundColor?.[colorScheme ?? 'light'];

  return (
    <ScrollView style={{ flex: 1 }} bounces={false}>
      {headerImage && (
        <View
          style={[
            styles.header,
            {
              backgroundColor: headerBgColor,
            },
          ]}>
          {headerImage}
        </View>
      )}
      <View style={[styles.content, { backgroundColor }]}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 200,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
}); 