import { StyleSheet, View } from 'react-native';

/** Small padlock drawn with views (no icon font needed). */
export function LockIcon({ size = 12, color }: { size?: number; color: string }) {
  const body = size * 0.72;
  const shackleW = size * 0.5;
  return (
    <View style={{ width: size, height: size, alignItems: 'center' }} accessibilityElementsHidden>
      <View
        style={{
          width: shackleW,
          height: size * 0.5,
          borderWidth: Math.max(1.5, size * 0.13),
          borderColor: color,
          borderBottomWidth: 0,
          borderTopLeftRadius: shackleW / 2,
          borderTopRightRadius: shackleW / 2,
        }}
      />
      <View
        style={[
          styles.body,
          { width: body, height: size * 0.5, borderRadius: size * 0.14, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({ body: { marginTop: -1 } });
