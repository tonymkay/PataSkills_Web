import { Pressable, Text, View } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme, Spacing, Radius, Typography, IconSize, StaticColors } from '@/theme/tokens';
import { Button } from './Button';
import { BottomSheet } from './BottomSheet';

/**
 * "Update ready — restart now?" bottom sheet, shown from Settings' "Check
 * for updates" row once a fresh check finds and downloads a new bundle (or
 * immediately, if one was already sitting downloaded from a previous
 * check). Mirrors PataSkillsV2's components/ui/UpdateReadySheet.tsx —
 * same copy, same layout — rebuilt on Play's own BottomSheet/Button/
 * Typography primitives (Play has no AppText/AppButton).
 */
export function UpdateReadySheet({
  visible,
  onClose,
  onRestart,
}: {
  visible: boolean;
  onClose: () => void;
  onRestart: () => void;
}) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: Radius.full,
            backgroundColor: colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw size={IconSize.header} color={StaticColors.tealAccent} strokeWidth={2} />
        </View>

        <Text style={[Typography.headlineSm, { color: colors.onSurface }]}>Update ready</Text>
        <Text style={[Typography.bodySm, { color: colors.onSurfaceVariant, textAlign: 'center' }]}>
          Restart the app to apply the latest version.
        </Text>

        <Button
          label="Apply Updates"
          onPress={onRestart}
          backgroundColor={StaticColors.achievementAmber}
          textColor="#000"
          style={{ marginTop: Spacing.sm }}
        />
        <Pressable onPress={onClose} hitSlop={10} style={{ paddingTop: Spacing.xs }}>
          <Text style={[Typography.labelMd, { color: colors.onSurfaceVariant }]}>Later</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
