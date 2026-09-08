/**
 * Overlapping-circle avatar row with a trailing "+N others" label. Ported
 * from pataskillsv2's components/home/AvatarStack.tsx — same layout/overflow
 * logic, swapped onto Play's plain <Text>/theme/tokens convention (no
 * AppText wrapper) and Play's own Avatar component.
 */
import { Text, View } from 'react-native';
import { Spacing, Typography, useTheme } from '@/theme/tokens';
import { Avatar } from '@/components/profile/Avatar';

export type AvatarStackMember = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export function AvatarStack({
  members,
  extraCount = 0,
  maxVisible = 3,
  size = 36,
  showLabel = true,
}: {
  members: AvatarStackMember[];
  /** Count beyond `members` to fold into the "+N others" label. */
  extraCount?: number;
  maxVisible?: number;
  size?: number;
  showLabel?: boolean;
}) {
  const { colors } = useTheme();
  const visible = members.slice(0, maxVisible);
  const overflow = extraCount + Math.max(0, members.length - maxVisible);
  const overlap = size * 0.32;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flexDirection: 'row' }}>
        {visible.map((m, i) => (
          <View
            key={m.id}
            style={{
              marginLeft: i === 0 ? 0 : -overlap,
              borderWidth: 2,
              borderColor: colors.surfaceContainerLow,
              borderRadius: size / 2 + 2,
            }}
          >
            <Avatar name={m.name} size={size} imageUrl={m.imageUrl} />
          </View>
        ))}
      </View>
      {showLabel && overflow > 0 && (
        <Text
          style={[
            Typography.bodySm,
            { color: colors.onSurfaceVariant, marginLeft: Spacing.sm },
          ]}
        >
          {`+${overflow} others`}
        </Text>
      )}
    </View>
  );
}
