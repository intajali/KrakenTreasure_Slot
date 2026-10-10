export interface IReelController {
    readonly reelIndex: number;
    initialize(reelIndex: number, strip: readonly number[]): void;
    spin(): void;
    stop(stripIndex: number, onComplete?: () => void): void;
    update(dt: number): void;
    reset(): void;
    dispose(): void;
}
