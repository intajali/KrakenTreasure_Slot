import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { SpinMode } from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { BetEvents } from '../betting/BetEvents';
import { SlotGameStateBase } from './SlotGameStateBase';

export class FreeSpinState extends SlotGameStateBase {
    public readonly id = SlotGameState.FreeSpin;

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });

        const session = this.owner.session;

        if (session.freeSpinsRemaining <= 0) {
            const totalWin = Math.max(0, Math.floor(session.freeSpinTotalWin));
            session.spinMode = SpinMode.Normal;
            session.freeSpinActive = false;
            EventBus.emit(SlotEvents.FreeSpinEnded, {
                totalWin,
                total: session.freeSpinTotal,
            });

            if (totalWin > 0) {
                this.owner.creditWin(totalWin);
                EventBus.emit(BetEvents.WinCredited, {
                    amount: totalWin,
                    balance: this.owner.getBalance(),
                    freeSpinTotalWin: totalWin,
                    source: 'free_spin_complete',
                });
            }

            session.freeSpinTotalWin = 0;
            this.transition(SlotGameState.Ready);
            return;
        }

        session.spinMode = SpinMode.FreeSpin;

        if (!session.freeSpinActive) {
            session.freeSpinActive = true;
            session.freeSpinTotal = session.freeSpinsRemaining;
            session.freeSpinTotalWin = 0;
            EventBus.emit(SlotEvents.FreeSpinStarted, {
                remaining: session.freeSpinsRemaining,
                total: session.freeSpinTotal,
                totalWin: session.freeSpinTotalWin,
            });
        }

        session.freeSpinsRemaining--;
        EventBus.emit(SlotEvents.FreeSpinUpdated, {
            remaining: session.freeSpinsRemaining,
            total: session.freeSpinTotal,
            totalWin: session.freeSpinTotalWin,
        });
        this.transition(SlotGameState.Spinning);
    }
}
