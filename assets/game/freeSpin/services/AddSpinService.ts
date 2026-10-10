import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { ISlotGameSession, SpinMode } from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { ReelsContainer } from '../../reels/controller/ReelsContainer';
import { REEL_CONFIG } from '../../reels/config/ReelConfig';
import { ADD_SPIN_CONFIG } from '../config/AddSpinConfig';
import {
    AddSpinEvents,
    AddSpinLandedPayload,
    AddSpinPosition,
} from '../AddSpinEvents';

export interface AddSpinHost {
    getSession(): ISlotGameSession;
    getReelsContainer(): ReelsContainer | null;
}

/**
 * During free spins, randomly overlays ADDSPIN on a stopped reel cell and awards +N free spins.
 * Overlay is visual-only (does not replace strip symbols).
 */
export class AddSpinService {
    private readonly handleAllReelsStopped = () => this.onAllReelsStopped();
    private readonly handleSpinStarted = () => this.clearOverlays();

    constructor(private readonly host: AddSpinHost) {}

    public register(): void {
        EventBus.on(SlotEvents.AllReelsStopped, this.handleAllReelsStopped);
        EventBus.on(SlotEvents.SpinStarted, this.handleSpinStarted);
    }

    public unregister(): void {
        EventBus.off(SlotEvents.AllReelsStopped, this.handleAllReelsStopped);
        EventBus.off(SlotEvents.SpinStarted, this.handleSpinStarted);
        this.clearOverlays();
    }

    private onAllReelsStopped(): void {
        if (!ADD_SPIN_CONFIG.enabled) {
            return;
        }

        const session = this.host.getSession();
        if (ADD_SPIN_CONFIG.freeSpinOnly && !this.isFreeSpinContext(session)) {
            return;
        }

        const chance = Math.min(1, Math.max(0, ADD_SPIN_CONFIG.appearChance));
        if (Math.random() > chance) {
            return;
        }

        const positions = this.pickRandomPositions();
        if (positions.length === 0) {
            return;
        }

        const spinsAwarded = Math.max(0, ADD_SPIN_CONFIG.spinsAwarded) * positions.length;
        if (spinsAwarded > 0) {
            session.freeSpinsRemaining += spinsAwarded;
            session.freeSpinTotal += spinsAwarded;
            EventBus.emit(SlotEvents.FreeSpinUpdated, {
                remaining: session.freeSpinsRemaining,
                total: session.freeSpinTotal,
                totalWin: session.freeSpinTotalWin,
            });
        }

        this.host.getReelsContainer()?.showAddSpinOverlays(positions, ADD_SPIN_CONFIG.symbolId);

        const payload: AddSpinLandedPayload = {
            positions,
            spinsAwarded,
            freeSpinsRemaining: session.freeSpinsRemaining,
            freeSpinTotal: session.freeSpinTotal,
        };
        EventBus.emit(AddSpinEvents.Landed, payload);
    }

    private isFreeSpinContext(session: ISlotGameSession): boolean {
        return session.freeSpinActive || session.spinMode === SpinMode.FreeSpin;
    }

    private pickRandomPositions(): AddSpinPosition[] {
        const reelCount = Math.max(1, REEL_CONFIG.reelCount);
        const rowCount = Math.max(1, REEL_CONFIG.visibleRows);
        const maxOverlays = Math.max(1, ADD_SPIN_CONFIG.maxOverlaysPerSpin);
        const positions: AddSpinPosition[] = [];
        const used = new Set<string>();

        const attempts = maxOverlays * 4;
        for (let i = 0; i < attempts && positions.length < maxOverlays; i++) {
            const reel = Math.floor(Math.random() * reelCount);
            const row = Math.floor(Math.random() * rowCount);
            const key = `${reel}:${row}`;
            if (used.has(key)) {
                continue;
            }
            used.add(key);
            positions.push({ reel, row });
        }

        return positions;
    }

    private clearOverlays(): void {
        this.host.getReelsContainer()?.clearAddSpinOverlays();
        EventBus.emit(AddSpinEvents.Cleared);
    }
}
