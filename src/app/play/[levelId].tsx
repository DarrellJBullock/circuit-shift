import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isAtStart, isConductive } from '@/engine';
import { isLevelUnlocked } from '@/levels/progression';
import { getLevel, nextLevel } from '@/levels/registry';
import { useProgression } from '@/levels/useProgression';
import { CompletionOverlay } from '@/play/CompletionOverlay';
import { PauseOverlay } from '@/play/PauseOverlay';
import { formatTime, referenceLabel } from '@/play/format';
import { CoachMark } from '@/play/CoachMark';
import { hintAccess } from '@/play/hintPolicy';
import { useAdsUi, watchAdForHint } from '@/play/rewardedHint';
import { TUTORIAL_FINAL_LEVEL, tilesToGuide, tutorialStepFor } from '@/play/tutorial';
import { BoardView } from '@/render/BoardView';
import { describeChange } from '@/render/a11y';
import { layoutBoard } from '@/render/geometry';
import { feedback } from '@/services/feedback';
import { useEntitlements } from '@/state/entitlementStore';
import { useGame } from '@/state/gameStore';
import { useSettings } from '@/state/settingsStore';
import { Button } from '@/ui/Button';
import { MIN_TOUCH, colors, fontScale, spacing, type } from '@/ui/theme';

const TICK_MS = 250;

export default function Play() {
  const { levelId } = useLocalSearchParams<{ levelId: string }>();
  const level = useGame((s) => s.level);
  const game = useGame((s) => s.game);
  const completion = useGame((s) => s.completion);
  const dispatch = useGame((s) => s.dispatch);
  const lastHint = useGame((s) => s.lastHint);
  const tutorial = useSettings((s) => s.tutorial);
  const noAds = useEntitlements((s) => s.active.has('no_ads'));
  const adsAvailable = useAdsUi((s) => s.available);
  const adBusy = useAdsUi((s) => s.busy);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const progression = useProgression();
  const requested = getLevel(levelId ?? '');
  const missing = requested === undefined;
  // Deep links must respect progression (and, from Phase 6, entitlements).
  // Once a level is open it stays playable even if the unlock state changes.
  const locked = !missing && !isLevelUnlocked(progression, requested) && level?.id !== requested.id;

  useEffect(() => {
    if (!levelId || missing || locked) return;
    useGame.getState().start(levelId);
    return () => useGame.getState().clear();
  }, [levelId, missing, locked]);

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
      if (tile && tile.locked && isConductive(tile)) feedback('locked');
      return;
    }
    const announcement = describeChange(before.evaluation, after.evaluation, useGame.getState().completion?.stars);
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement);
    if (after.status === 'won') return feedback('win');
    const satisfied = (g: typeof after) => g.evaluation.objectives.filter((o) => o.satisfied).length;
    feedback(satisfied(after) > satisfied(before) ? 'connect' : 'rotate');
  }, []);

  // Finishing the last tutorial level completes the tutorial.
  useEffect(() => {
    if (completion && level?.id === TUTORIAL_FINAL_LEVEL && useSettings.getState().tutorial === 'pending') {
      useSettings.getState().update({ tutorial: 'done' });
    }
  }, [completion, level]);

  const afterHint = useCallback((before: ReturnType<typeof useGame.getState>['game'], index: number | null) => {
    const after = useGame.getState().game;
    if (index === null || !before || !after) return;
    const w = after.board.width;
    AccessibilityInfo.announceForAccessibility(
      `Hint: rotated the tile at row ${Math.floor(index / w) + 1}, column ${(index % w) + 1}.`,
    );
    const change = describeChange(before.evaluation, after.evaluation, useGame.getState().completion?.stars);
    if (change) AccessibilityInfo.announceForAccessibility(change);
    feedback(after.status === 'won' ? 'win' : 'rotate');
  }, []);

  const onHint = useCallback(async () => {
    setAdMessage(null);
    const before = useGame.getState().game;
    if (!before) return;
    const access = hintAccess(before.hintsUsed, { noAds, adsAvailable });
    if (access.kind === 'watchAd') {
      const outcome = await watchAdForHint();
      // Grants nothing unless the ad SDK confirmed the reward.
      const index = useGame.getState().requestRewardedHint(outcome);
      if (index === null) {
        const msg =
          outcome.kind === 'dismissed'
            ? 'Watch the whole video to earn a hint.'
            : outcome.kind === 'rewarded'
              ? null
              : outcome.kind === 'unavailable'
                ? outcome.reason
                : 'The ad could not be shown.';
        setAdMessage(msg);
        if (msg) AccessibilityInfo.announceForAccessibility(msg);
      }
      afterHint(before, index);
      return;
    }
    afterHint(before, useGame.getState().requestHint());
  }, [noAds, adsAvailable, afterHint]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  }, []);

  if (missing || locked) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Text style={type.heading}>{missing ? 'Level not found' : 'Level locked'}</Text>
          {locked ? <Text style={type.caption}>Complete the earlier levels to unlock it.</Text> : null}
          <Button label="Back" variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }
  if (!game || !level) return <View style={styles.root} />;

  const layout = layoutBoard(level.width, level.height, area.width, area.height);
  const access = hintAccess(game.hintsUsed, { noAds, adsAvailable });
  const hintLabel =
    adBusy
      ? 'Loading ad…'
      : access.kind === 'free'
        ? `Hint · ${access.remaining}`
        : access.kind === 'unlimited'
          ? 'Hint'
          : access.kind === 'watchAd'
            ? 'Hint · Ad'
            : 'No hints';
  const step = tutorialStepFor(level.id, tutorial);
  const guide = step?.guide && game.status === 'playing' ? tilesToGuide(level, game) : undefined;
  const candidate = nextLevel(level.id);
  const next = candidate && isLevelUnlocked(progression, candidate) ? candidate : undefined;
  // dismissTo pops back to the list if it is already in the stack (no duplicate screens).
  const goLevels = () =>
    level.chapterId === 'daily'
      ? router.dismissTo('/daily')
      : router.dismissTo({ pathname: '/chapters/[chapterId]', params: { chapterId: level.chapterId } });

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
          <Text style={styles.levelNo} maxFontSizeMultiplier={fontScale.dense}>
            {level.chapterId === 'daily' ? 'DAILY CHALLENGE' : `${level.chapterId.replace('ch', 'CHAPTER ')} · ${level.order}`}
          </Text>
          <Text style={type.heading} numberOfLines={1} maxFontSizeMultiplier={fontScale.dense}>
            {level.title.replace('Daily · ', '')}
          </Text>
        </View>
        <Text style={styles.timer} maxFontSizeMultiplier={fontScale.dense} accessibilityLabel={`Time ${formatTime(game.elapsedMs)}`}>
          {formatTime(game.elapsedMs)}
        </Text>
      </View>

      <View style={styles.stats} accessible accessibilityLabel={`${game.moves} moves. ${referenceLabel(level.optimalMoves, level.solutionMetadata.parMoves)}.`}>
        <Text style={styles.moves} maxFontSizeMultiplier={fontScale.dense}>
          {game.moves} <Text style={type.caption}>moves</Text>
        </Text>
        <Text style={type.caption} maxFontSizeMultiplier={fontScale.dense}>{referenceLabel(level.optimalMoves, level.solutionMetadata.parMoves)}</Text>
      </View>

      <View testID="board-area" style={styles.boardArea} onLayout={onLayout}>
        {layout.cell > 0 ? <BoardView game={game} cell={layout.cell} onTilePress={onTilePress} hint={lastHint} guide={guide} /> : null}
      </View>

      {adMessage ? (
        <Text style={styles.adMessage} accessibilityLiveRegion="polite">
          {adMessage}
        </Text>
      ) : null}
      {step ? <CoachMark step={step} onSkip={() => useSettings.getState().update({ tutorial: 'skipped' })} /> : null}

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
        <Button
          testID="hint"
          label={hintLabel}
          variant="secondary"
          compact
          disabled={game.status !== 'playing' || access.kind === 'none' || adBusy}
          accessibilityHint={
            access.kind === 'watchAd'
              ? 'Watch a short video ad to get a hint. Using a hint caps this level at two stars.'
              : 'Rotates one tile toward a solution. Using a hint caps this level at two stars.'
          }
          onPress={() => void onHint()}
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
  adMessage: { ...type.caption, textAlign: 'center', paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
});

export { RouteError as ErrorBoundary } from '@/ui/RouteError';
