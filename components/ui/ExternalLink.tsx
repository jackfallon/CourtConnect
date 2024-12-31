import { Link } from 'expo-router';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
}

export function ExternalLink({ href, children }: ExternalLinkProps) {
  return (
    <Link
      href={href}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          // Prevent the default behavior of linking to the default browser on native
          e.preventDefault();
          // Open the link in an in-app browser
          WebBrowser.openBrowserAsync(href);
        }
      }}>
      {children}
    </Link>
  );
} 