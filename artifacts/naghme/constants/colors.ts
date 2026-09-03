/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const darkPalette = {
  text: '#F6F0E8',
  tint: '#E5A35D',
  background: '#121212',
  foreground: '#F6F0E8',
  card: '#1D1C1C',
  cardForeground: '#F6F0E8',
  primary: '#E5A35D',
  primaryForeground: '#121212',
  secondary: '#272323',
  secondaryForeground: '#F6F0E8',
  muted: '#242020',
  mutedForeground: '#A89D96',
  accent: '#3A2A22',
  accentForeground: '#F4C38C',
  destructive: '#D96B5F',
  destructiveForeground: '#FFFFFF',
  border: '#342E2B',
  input: '#342E2B',
  galleryFrame: '#F5F5DC',
};

const colors = {
  // Naghme intentionally stays dark even when the device uses a light theme.
  light: darkPalette,
  dark: darkPalette,
  radius: 16,
};

export default colors;
