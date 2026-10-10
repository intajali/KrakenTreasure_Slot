export interface IReelView {
    setStrip(strip: readonly number[], visibleRows: number): void;
    initialize(): void;
    startSpin(): void;
    stopAtIndex(stripIndex: number, onComplete?: () => void): void;
    update(dt: number): void;
    dispose(): void;
}
