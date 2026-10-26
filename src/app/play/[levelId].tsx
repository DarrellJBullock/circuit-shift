import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isAtStart, isConductive } from '@/engine';
import { getLevel, nextLevel } from '@/levels/registry';
import { CompletionOverlay } from '@/play/CompletionOverlay';
import { PauseOverlay } from '@/play/PauseOverlay';
import { formatTime, referenceLabel } from '@/play/format';
import { BoardView } from '@/render/BoardView';
import { layoutBoard } from '@/render/geometry';
import { haptic } from '@/services/haptics';
import { useGame } from '@/state/gameStore';
import { Button } from '@/ui/Button';
import { MIN_TOUCH, colors, spacing, type } from '@/ui/theme';

const TICK_MS = 250;

export default function Play() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = useGame((s) => s.level);
  const game = useGame((s) => s.game);
  const completion = useGame((s) => s.completion);
  const dispatch = useGame((s) => s.dispatch);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const missing = getLevel(levelId ?? '') === undefined;

  useEffect(() => {
    if (!levelId || missing) return;
    useGame.getState().start(levelId);
    return () => useGame.getState().clear();
  }, [levelId, missing]);

  const status = game?.status;
  useEffect(() => {
    if (status !== 'playing') return;
    const id = setInterval(() => dispatch({ type: 'tick', deltaMs: TICK_MS }), TICK_MS);
    return () => clearInterval(id);
  }, [status, dispatch]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') useGame.getState().dispatch({ type: 'pause' });
    });
    return () => sub.remove();
  }, []);

  const onTilePress = useCallback((index: number) => {
    const before = useGame.getState().game;
    useGame.getState().dispatch({ type: 'rotate', index });
    const after = useGame.getState().game;
    if (!before || !after) return;
    if (after === before) {
      const tile = before.board.tiles[index];
      if (tile && tile.locked && isConductive(tile)) haptic('locked');
      return;
    }
    haptic(after.status === 'won' ? 'win' : 'rotate');
  }, []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  }, []);

  if (missing) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={type.heading}>Level not found</Text>
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }
  if (!game || !level) return <View style={styles.root} />;

  const layout = layoutBoard(level.width, level.height, area.width, area.height);
  const next = nextLevel(level.id);
  const goLevels = () =>
    router.replace({ pathname: '/chapters/[chapterId]', params: { chapterId: level.chapterId } });

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          testID="pause-button"
          onPress={() => dispatch({ type: 'pause' })}
          accessibilityRole="button"
          accessibilityLabel="Pause"
          style={styles.iconBtn}
          disabled={game.status !== 'playing'}
        >
          <View style={styles.pauseGlyph}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={styles.levelNo}>
            {level.chapterId.replace('ch', 'CHAPTER ')} · {level.order}
          </Text>
          <Text style={type.heading} numberOfLines={1}>
            {level.title}
          </Text>
        </View>
        <Text style={styles.timer} accessibilityLabel={`Time ${formatTime(game.elapsedMs)}`}>
          {formatTime(game.elapsedMs)}
        </Text>
      </View>

      <View style={styles.stats} accessible accessibilityLabel={`${game.moves} moves. ${referenceLabel(level.optimalMoves, level.solutionMetadata.parMoves)}.`}>
        <Text style={styles.moves}>
          {game.moves} <Text style={type.caption}>moves</Text>
        </Text>
        <Text style={type.caption}>{referenceLabel(level.optimalMoves, level.solutionMetadata.parMoves)}</Text>
      </View>

      <View testID="board-area" style={styles.boardArea} onLayout={onLayout}>
        {layout.cell > 0 ? <BoardView game={game} cell={layout.cell} onTilePress={onTilePress} /> : null}
      </View>

      <View style={styles.toolbar}>
        <Button
          testID="undo"
          label="Undo"
          variant="secondary"
          compact
          disabled={game.status !== 'playing' || game.history.length === 0}
          onPress={() => dispatch({ type: 'undo' })}
          style={styles.flex}
        />
        <Button
          testID="reset"
          label="Reset"
          variant="secondary"
          compact
          disabled={game.status !== 'playing' || isAtStart(game)}
          onPress={() => dispatch({ type: 'reset' })}
          style={styles.flex}
        />
      </View>

      {game.status === 'paused' ? (
        <PauseOverlay
          onResume={() => dispatch({ type: 'resume' })}
          onRestart={() => useGame.getState().start(level.id, { fresh: true })}
          onQuit={goLevels}
        />
      ) : null}

      {completion ? (
        <CompletionOverlay
          {...completion}
          optimalMoves={level.optimalMoves}
          parMoves={level.solutionMetadata.parMoves}
          hasNext={next !== undefined}
          onNext={() => next && router.replace({ pathname: '/play/[levelId]', params: { levelId: next.id } })}
          onReplay={() => useGame.getState().start(level.id, { fresh: true })}
          onLevels={goLevels}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm },
  iconBtn: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  pauseGlyph: { flexDirection: 'row', gap: 5 },
  pauseBar: { width: 5, height: 18, borderRadius: 2, backgroundColor: colors.text },
  titleBlock: { flex: 1 },
  levelNo: { color: colors.electricity, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  timer: { color: colors.textMuted, fontSize: 16, fontVariant: ['tabular-nums'], minWidth: 48, textAlign: 'right' },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  moves: { color: colors.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  boardArea: { flex: 1, margin: spacing.md, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  flex: { flex: 1 },
});

export { RouteError as ErrorBoundary } from '@/ui/RouteError';
