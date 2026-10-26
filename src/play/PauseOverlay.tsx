import { StyleSheet, Text } from 'react-native';

import { Button } from '@/ui/Button';
import { colors } from '@/ui/theme';

import { Overlay } from './Overlay';

export interface PauseOverlayProps {
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onQuit: () => void;
}

export function PauseOverlay({ onResume, onRestart, onQuit }: PauseOverlayProps) {
  return (
    <Overlay testID="pause">
      <Text style={styles.title} accessibilityRole="header">
        PAUSED
      </Text>
      <Button testID="resume" label="Resume" onPress={onResume} />
      <Button label="Restart level" variant="secondary" onPress={onRestart} />
      <Button label="Quit to levels" variant="ghost" onPress={onQuit} />
    </Overlay>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: 4, textAlign: 'center' },
});
