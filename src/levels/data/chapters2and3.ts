import type { Level } from '../schema';
import ch2 from './ch2.generated.json';
import ch3 from './ch3.generated.json';

// Plain JSON; the registry validates every level before it reaches the renderer.
export const chapter2Levels: readonly Level[] = ch2 as unknown as Level[];
export const chapter3Levels: readonly Level[] = ch3 as unknown as Level[];
