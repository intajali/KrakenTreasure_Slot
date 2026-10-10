import reelConfigData from 'db://assets/resources/reel/ReelConfig.json';
import reelStripsData from 'db://assets/resources/reel/ReelStrips.json';

export interface ReelConfig {
    reelCount: number;
    visibleRows: number;
    spinDurationMs: number;
    stopDelayMs: number;
    reelStopGapMs: number;
    /**
     * Max time to ease onto the stop index, regardless of strip length.
     * 0 leaves landing uncapped (distance / spin speed).
     */
    stopDurationMs: number;
    reelStrips: readonly (readonly number[])[];
    /** Max reel scroll speed in strip-rows per second during spin. */
    spinSpeedRowsPerSec: number;
    /** Acceleration applied when the reel starts spinning. */
    spinAccelerationRowsPerSecSq: number;
    /** Minimum speed while stopping (strip-rows per second). */
    minStopSpeedRowsPerSec: number;
    /** Larger values stop faster; lower values feel heavier. */
    stopDecelerationFactor: number;
    /** Extra full strip laps before landing on stop index. */
    stopExtraLaps: number;
    /** Small bounce after reel lands (strip-rows). */
    stopBounceRows: number;
}

export interface ReelConfigData extends Omit<ReelConfig, 'reelStrips' | 'stopDurationMs'> {
    rowHeight: number;
    reelWidth: number;
    stopDurationMs?: number;
}

export interface ReelStripsData {
    reelStrips: readonly (readonly number[])[];
    /** Strip index where each reel stops (center visible row). */
    demoStopIndices: number[];
}

const reelConfig = reelConfigData as ReelConfigData;
const reelStrips = reelStripsData as ReelStripsData;

export const REEL_CONFIG: ReelConfig = {
    reelCount: reelConfig.reelCount,
    visibleRows: reelConfig.visibleRows,
    spinDurationMs: reelConfig.spinDurationMs,
    stopDelayMs: reelConfig.stopDelayMs,
    reelStopGapMs: reelConfig.reelStopGapMs,
    stopDurationMs: reelConfig.stopDurationMs ?? 0,
    reelStrips: reelStrips.reelStrips,
    spinSpeedRowsPerSec: reelConfig.spinSpeedRowsPerSec,
    spinAccelerationRowsPerSecSq: reelConfig.spinAccelerationRowsPerSecSq,
    minStopSpeedRowsPerSec: reelConfig.minStopSpeedRowsPerSec,
    stopDecelerationFactor: reelConfig.stopDecelerationFactor,
    stopExtraLaps: reelConfig.stopExtraLaps,
    stopBounceRows: reelConfig.stopBounceRows,
};

/** Strip index where each reel stops (center visible row). */
export const DEMO_STOP_INDICES = reelStrips.demoStopIndices;

export const REEL_ROW_HEIGHT = reelConfig.rowHeight;
export const REEL_WIDTH = reelConfig.reelWidth;
