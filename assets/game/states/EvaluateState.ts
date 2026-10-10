import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { ReelStopIndexGenerator } from 'db://assets/core/reel/ReelStopIndexGenerator';
import { REEL_CONFIG } from '../reels/config/ReelConfig';
import { SlotGameStateBase } from './SlotGameStateBase';

export class EvaluateState extends SlotGameStateBase {
    public readonly id = SlotGameState.Evaluate;
    private readonly stopIndexGenerator = new ReelStopIndexGenerator();

    public enter(): void {
        EventBus.emit(SlotEvents.StateChanged, { state: this.id });

        const stopIndices = this.owner.session.currentStopIndices.length > 0
            ? this.owner.session.currentStopIndices
            : this.stopIndexGenerator.generateStopIndices(REEL_CONFIG.reelStrips);

        this.owner.session.currentStopIndices = [...stopIndices];

        const reelWindow = this.owner.buildReelWindow(stopIndices);
        const result = this.owner.evaluateSpin(reelWindow, this.owner.getBetSelection());

        this.owner.session.lastSpinResult = result;
        this.owner.session.featureTriggered = result.isFeatureTriggered;

        EventBus.emit(SlotEvents.WinEvaluated, result);

        this.transition(SlotGameState.Result);
    }
}
