import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { JackpotEvents } from '../jackpot/JackpotEvents';
import { REEL_CONFIG, ReelConfig } from '../reels/config/ReelConfig';
import { GAME_SPEED_CONFIG } from './GameSpeedConfig';
import { GameSpeedEvents, GameSpeedSnapshot } from './GameSpeedEvents';
import { GameSpeedStorage } from './GameSpeedStorage';

const SPEED_LOCKED_STATES = new Set<SlotGameState>([
    SlotGameState.Spinning,
    SlotGameState.Stop,
    SlotGameState.FreeSpin,
    SlotGameState.Feature,
    SlotGameState.AutoSpin,
]);

/**
 * Single game-speed factor (0.1..1) shared by GameSettingsPanelView and SpeedMeterView.
 * Scales reel spin speed and the sequential 1→5 stop duration budget
 * (max speed ≈ 1s, slower ≈ 2–3s). Speed cannot change during spin / free-spin / feature / auto-spin.
 */
export class GameSpeedController {
    private static readonly storage = new GameSpeedStorage();
    private static speed = GAME_SPEED_CONFIG.default;
    private static initialized = false;
    private static currentState: SlotGameState | null = null;
    private static autoSpinActive = false;
    private static freeSpinActive = false;
    private static featureActive = false;
    private static jackpotFeatureActive = false;
    private static locked = false;

    public static initialize(): void {
        if (this.initialized) {
            return;
        }

        this.speed = this.snapSpeed(this.storage.load() ?? GAME_SPEED_CONFIG.default);
        this.bindLockListeners();
        this.initialized = true;
        this.refreshLock();
        EventBus.emit(GameSpeedEvents.Changed, this.getSnapshot());
    }

    public static getSpeed(): number {
        return this.speed;
    }

    public static canChangeSpeed(): boolean {
        return !this.locked;
    }

    public static getSnapshot(): GameSpeedSnapshot {
        const index = this.speedToIndex(this.speed);
        const levels = this.getMeterLevelCount();
        return {
            speed: this.speed,
            normalized: levels === 0 ? 1 : index / levels,
            meterAngle: this.indexToAngle(index),
            locked: this.locked,
        };
    }

    public static logReelSpeed(reason: string): void {
        const config = this.buildReelConfig();
        console.log(
            `[ReelSpeed] ${reason}`,
            `speed=${this.speed}`,
            `spinDurationMs=${config.spinDurationMs}`,
            `reelStopGapMs=${config.reelStopGapMs}`,
            `stopDurationMs=${config.stopDurationMs}`,
            `spinSpeedRowsPerSec=${config.spinSpeedRowsPerSec}`,
            `spinAccelerationRowsPerSecSq=${config.spinAccelerationRowsPerSecSq}`,
        );
    }

    public static setSpeed(speed: number): void {
        if (this.locked) {
            return;
        }

        const next = this.snapSpeed(speed);
        if (next === this.speed && this.initialized) {
            return;
        }

        this.speed = next;
        this.storage.save(next);
        EventBus.emit(GameSpeedEvents.Changed, this.getSnapshot());
    }

    public static setMeterAngle(angle: number): void {
        this.setSpeed(this.indexToSpeed(this.angleToIndex(angle)));
    }

    public static adjustSpeed(delta: number): void {
        const direction = Math.sign(delta);
        if (direction === 0) {
            return;
        }

        this.setSpeed(this.indexToSpeed(this.speedToIndex(this.speed) + direction));
    }

    public static getSpinDurationMs(): number {
        return this.buildReelConfig().spinDurationMs;
    }

    public static getReelStopGapMs(): number {
        return this.buildReelConfig().reelStopGapMs;
    }

    public static buildReelConfig(): ReelConfig {
        const speed = this.speed;
        const durationScale = this.getDurationScale();
        return {
            ...REEL_CONFIG,
            spinDurationMs: Math.round(REEL_CONFIG.spinDurationMs * durationScale),
            reelStopGapMs: Math.round(REEL_CONFIG.reelStopGapMs * durationScale),
            stopDurationMs: Math.round(REEL_CONFIG.stopDurationMs * durationScale),
            stopDelayMs: 0,
            spinSpeedRowsPerSec: Math.max(1, REEL_CONFIG.spinSpeedRowsPerSec * speed),
            spinAccelerationRowsPerSecSq: Math.max(1, REEL_CONFIG.spinAccelerationRowsPerSecSq * speed),
        };
    }

    /**
     * Sequential 1→5 stops: speed 1.0 → ~1s total, 0.5 → ~2s, 0.1 → ~2.5–3s.
     */
    private static getDurationScale(): number {
        return 1 + (1 - this.speed) * 2.2;
    }

    public static getMeterLevelCount(): number {
        return Math.round(
            Math.abs(GAME_SPEED_CONFIG.meterMaxAngle - GAME_SPEED_CONFIG.meterMinAngle)
            / GAME_SPEED_CONFIG.meterAngleStep,
        );
    }

    private static snapSpeed(speed: number): number {
        return this.indexToSpeed(this.speedToIndex(this.clamp(speed)));
    }

    private static speedToIndex(speed: number): number {
        const levels = this.getMeterLevelCount();
        const span = GAME_SPEED_CONFIG.max - GAME_SPEED_CONFIG.min;
        if (levels <= 0 || span <= 0) {
            return 0;
        }

        const t = (this.clamp(speed) - GAME_SPEED_CONFIG.min) / span;
        return Math.round(Math.min(1, Math.max(0, t)) * levels);
    }

    private static indexToSpeed(index: number): number {
        const levels = this.getMeterLevelCount();
        const i = Math.min(levels, Math.max(0, Math.round(index)));
        if (levels <= 0) {
            return GAME_SPEED_CONFIG.default;
        }
        return GAME_SPEED_CONFIG.min + (i / levels) * (GAME_SPEED_CONFIG.max - GAME_SPEED_CONFIG.min);
    }

    private static indexToAngle(index: number): number {
        const levels = this.getMeterLevelCount();
        const i = Math.min(levels, Math.max(0, Math.round(index)));
        if (levels <= 0) {
            return GAME_SPEED_CONFIG.meterMinAngle;
        }
        return GAME_SPEED_CONFIG.meterMinAngle
            + (i / levels) * (GAME_SPEED_CONFIG.meterMaxAngle - GAME_SPEED_CONFIG.meterMinAngle);
    }

    private static angleToIndex(angle: number): number {
        const { meterMinAngle, meterMaxAngle, meterAngleStep } = GAME_SPEED_CONFIG;
        const lo = Math.min(meterMinAngle, meterMaxAngle);
        const hi = Math.max(meterMinAngle, meterMaxAngle);
        const clamped = Math.min(hi, Math.max(lo, angle));
        const snapped = Math.round(clamped / meterAngleStep) * meterAngleStep;
        const span = meterMaxAngle - meterMinAngle;
        if (Math.abs(span) < 1e-4) {
            return 0;
        }

        const t = (snapped - meterMinAngle) / span;
        return Math.round(Math.min(1, Math.max(0, t)) * this.getMeterLevelCount());
    }

    private static clamp(speed: number): number {
        if (!Number.isFinite(speed)) {
            return GAME_SPEED_CONFIG.default;
        }
        return Math.min(GAME_SPEED_CONFIG.max, Math.max(GAME_SPEED_CONFIG.min, speed));
    }

    private static bindLockListeners(): void {
        EventBus.on<{ state?: SlotGameState }>(SlotEvents.StateChanged, this.onStateChanged);
        EventBus.on(SlotEvents.AutoSpinStarted, this.onAutoSpinStarted);
        EventBus.on(SlotEvents.AutoSpinEnded, this.onAutoSpinEnded);
        EventBus.on(SlotEvents.FreeSpinStarted, this.onFreeSpinStarted);
        EventBus.on(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
        EventBus.on(SlotEvents.FeatureTriggered, this.onFeatureTriggered);
        EventBus.on(JackpotEvents.OpenRequested, this.onJackpotFeatureOpened);
        EventBus.on(JackpotEvents.JackpotTriggered, this.onJackpotFeatureOpened);
        EventBus.on(JackpotEvents.FeatureCompleted, this.onJackpotFeatureCompleted);
    }

    private static onStateChanged = (payload?: { state?: SlotGameState }): void => {
        this.currentState = payload?.state ?? null;
        if (this.currentState === SlotGameState.AutoSpin) {
            this.autoSpinActive = true;
        } else if (this.currentState === SlotGameState.FreeSpin) {
            this.freeSpinActive = true;
            this.featureActive = false;
        } else if (this.currentState === SlotGameState.Feature) {
            this.featureActive = true;
        } else if (this.currentState === SlotGameState.Ready) {
            this.featureActive = false;
        }
        this.refreshLock();
    };

    private static onAutoSpinStarted = (): void => {
        this.autoSpinActive = true;
        this.refreshLock();
    };

    private static onAutoSpinEnded = (): void => {
        this.autoSpinActive = false;
        this.refreshLock();
    };

    private static onFreeSpinStarted = (): void => {
        this.freeSpinActive = true;
        this.featureActive = false;
        this.refreshLock();
    };

    private static onFreeSpinEnded = (): void => {
        this.freeSpinActive = false;
        this.refreshLock();
    };

    private static onFeatureTriggered = (): void => {
        this.featureActive = true;
        this.refreshLock();
    };

    private static onJackpotFeatureOpened = (): void => {
        this.jackpotFeatureActive = true;
        this.refreshLock();
    };

    private static onJackpotFeatureCompleted = (): void => {
        this.jackpotFeatureActive = false;
        this.refreshLock();
    };

    private static refreshLock(): void {
        const next = this.computeLocked();
        if (next === this.locked) {
            return;
        }

        this.locked = next;
        if (this.initialized) {
            EventBus.emit(GameSpeedEvents.Changed, this.getSnapshot());
        }
    }

    private static computeLocked(): boolean {
        return this.autoSpinActive
            || this.freeSpinActive
            || this.featureActive
            || this.jackpotFeatureActive
            || (this.currentState != null && SPEED_LOCKED_STATES.has(this.currentState));
    }
}
