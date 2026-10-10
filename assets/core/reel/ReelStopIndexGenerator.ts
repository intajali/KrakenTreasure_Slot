import { RandomNumberGenerator } from '../utilities/RandomNumberGenerator';

export class ReelStopIndexGenerator {
    public constructor(private readonly rng = new RandomNumberGenerator()) {}

    public generateStopIndices(reelStrips: readonly (readonly number[])[]): number[] {
        return reelStrips.map(strip => this.generateStopIndex(strip));
    }

    public generateStopIndex(strip: readonly number[]): number {
        if (strip.length === 0) {
            return 0;
        }

        return this.rng.pickIndex(strip.length);
    }
}
