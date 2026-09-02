import { Platform, ScrollView, ScrollViewProps, StyleSheet } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';
import {
  MINI_PLAYER_CONTENT_PADDING,
  useMiniPlayerActive,
} from '@/hooks/useMiniPlayerActive';

type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = 'handled',
  ...props
}: Props) {
  const miniPlayerActive = useMiniPlayerActive();
  const flattenedContentStyle = StyleSheet.flatten(props.contentContainerStyle);
  const contentContainerStyle = miniPlayerActive
    ? {
        ...flattenedContentStyle,
        paddingBottom:
          Number(flattenedContentStyle?.paddingBottom ?? 0) + MINI_PLAYER_CONTENT_PADDING,
      }
    : props.contentContainerStyle;

  if (Platform.OS === 'web') {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
        contentContainerStyle={contentContainerStyle}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
      contentContainerStyle={contentContainerStyle}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
