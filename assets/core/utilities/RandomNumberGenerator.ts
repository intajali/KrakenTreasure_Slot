export interface IRandomSource {
    next(): number;
}

export class MathRandomSource implements IRandomSource {
    public next(): number {
        return Math.random();
    }
}

export class RandomNumberGenerator {
    public constructor(private readonly source: IRandomSource = new MathRandomSource()) {}

    public nextFloat(min = 0, max = 1): number {
        if (max <= min) {
            return min;
        }

        return min + this.source.next() * (max - min);
    }

    public nextInt(minInclusive: number, maxExclusive: number): number {
        if (maxExclusive <= minInclusive) {
            return minInclusive;
        }

        return Math.floor(this.nextFloat(minInclusive, maxExclusive));
    }

    public pickIndex(length: number): number {
        return this.nextInt(0, Math.max(0, length));
    }

    public pick<T>(items: readonly T[]): T | null {
        if (items.length === 0) {
            return null;
        }

        return items[this.pickIndex(items.length)];
    }
}
