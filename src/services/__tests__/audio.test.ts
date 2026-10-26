/* eslint-disable @typescript-eslint/no-require-imports -- fresh module registry per test via jest.resetModules */
/** Each test loads audio, expo-audio and the settings store from one fresh module registry. */
function load() {
  jest.resetModules();
  const audio = require('../audio') as typeof import('../audio');
  const expoAudio = require('expo-audio') as { setAudioModeAsync: jest.Mock; createAudioPlayer: jest.Mock };
  const { useSettings } = require('@/state/settingsStore') as typeof import('@/state/settingsStore');
  return { audio, expoAudio, useSettings };
}

describe('audio adapter', () => {
  it('uses an ambient session that respects the silent switch and mixes with music', async () => {
    const { audio, expoAudio } = load();
    await audio.initAudio();
    expect(expoAudio.setAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({ playsInSilentMode: false, interruptionMode: 'mixWithOthers', shouldPlayInBackground: false }),
    );
    expect(audio.audioState()).toBe('ready');
  });

  it('plays a cue only when sound is enabled', async () => {
    const { audio, expoAudio, useSettings } = load();
    await audio.initAudio();
    const players = expoAudio.createAudioPlayer.mock.results.map((r) => r.value as { play: jest.Mock });
    const plays = () => players.reduce((n, p) => n + p.play.mock.calls.length, 0);
    audio.playSound('win');
    expect(plays()).toBe(1);
    useSettings.setState({ soundEnabled: false });
    audio.playSound('win');
    expect(plays()).toBe(1);
  });

  it('rotates through a pool so rapid rotate clicks can overlap', async () => {
    const { audio, expoAudio } = load();
    await audio.initAudio();
    const players = expoAudio.createAudioPlayer.mock.results.map((r) => r.value as { play: jest.Mock });
    audio.playSound('rotate');
    audio.playSound('rotate');
    audio.playSound('rotate');
    expect(players.filter((p) => p.play.mock.calls.length === 1)).toHaveLength(3);
  });

  it('disables itself (no throw) when the audio session cannot be configured', async () => {
    const { audio, expoAudio } = load();
    expoAudio.setAudioModeAsync.mockRejectedValueOnce(new Error('no audio hardware'));
    await expect(audio.initAudio()).resolves.toBeUndefined();
    expect(audio.audioState()).toBe('disabled');
    expect(() => audio.playSound('rotate')).not.toThrow();
  });
});
