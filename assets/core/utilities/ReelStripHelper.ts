export function getVisibleSymbols(
    strip: readonly number[],
    stripIndex: number,
    visibleRows: number,
): number[] {
    if (strip.length === 0 || visibleRows <= 0) {
        return [];
    }

    const topRowIndex = stripIndex - Math.floor(visibleRows / 2);
    const symbols: number[] = [];

    for (let row = 0; row < visibleRows; row++) {
        symbols.push(strip[normalizeStripIndex(strip, topRowIndex + row)]);
    }

    return symbols;
}

export function normalizeStripIndex(strip: readonly number[], stripIndex: number): number {
    if (strip.length === 0) {
        return 0;
    }
    return ((stripIndex % strip.length) + strip.length) % strip.length;
}
