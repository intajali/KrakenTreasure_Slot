import { _decorator, Component } from 'cc';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { BetEvents } from '../betting/BetEvents';
import { DailyRewardsEvents } from '../dailyRewards/DailyRewardsEvents';
import { JackpotEvents } from '../jackpot/JackpotEvents';
import { AudioController } from './AudioController';
import { AudioIds } from './AudioIds';
const { ccclass, menu, property } = _decorator;

/**
 * Optional slot-game cue layer. Listens to gameplay events and requests sounds
 * through Audio / EventBus. Safe to omit; AudioManager still works on its own.
 */
@ccclass('AudioCueBinder')
@menu('Game/Audio/Audio Cue Binder')
export class AudioCueBinder extends Component {
    @property({ tooltip: 'Play looping spin SFX from SpinStarted until AllReelsStopped.' })
    loopSpinSfx = true;

    protected onEnable(): void {
        EventBus.on(SlotEvents.SpinStarted, this.onSpinStarted);
        EventBus.on(SlotEvents.ReelStopped, this.onReelStopped);
        EventBus.on(SlotEvents.AllReelsStopped, this.onAllReelsStopped);
        EventBus.on(SlotEvents.WinPresented, this.onWinPresented);
        EventBus.on(SlotEvents.FeatureTriggered, this.onFeatureTriggered);
        EventBus.on(SlotEvents.FreeSpinStarted, this.onFreeSpinStarted);
        EventBus.on(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
        EventBus.on(BetEvents.InsufficientCoins, this.onInsufficientCoins);
        EventBus.on(DailyRewardsEvents.Claimed, this.onRewardClaimed);
        EventBus.on(JackpotEvents.JackpotTriggered, this.onJackpotTriggered);
        EventBus.on(JackpotEvents.FeatureCompleted, this.onJackpotCompleted);
    }

    protected onDisable(): void {
        EventBus.off(SlotEvents.SpinStarted, this.onSpinStarted);
        EventBus.off(SlotEvents.ReelStopped, this.onReelStopped);
        EventBus.off(SlotEvents.AllReelsStopped, this.onAllReelsStopped);
        EventBus.off(SlotEvents.WinPresented, this.onWinPresented);
        EventBus.off(SlotEvents.FeatureTriggered, this.onFeatureTriggered);
        EventBus.off(SlotEvents.FreeSpinStarted, this.onFreeSpinStarted);
        EventBus.off(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
        EventBus.off(BetEvents.InsufficientCoins, this.onInsufficientCoins);
        EventBus.off(DailyRewardsEvents.Claimed, this.onRewardClaimed);
        EventBus.off(JackpotEvents.JackpotTriggered, this.onJackpotTriggered);
        EventBus.off(JackpotEvents.FeatureCompleted, this.onJackpotCompleted);
    }

    private onSpinStarted = (): void => {
        AudioController.playSfx(AudioIds.Spin, { loop: this.loopSpinSfx });
    };

    private onReelStopped = (): void => {
        AudioController.playSfx(AudioIds.ReelStop);
    };

    private onAllReelsStopped = (): void => {
        if (this.loopSpinSfx) {
            AudioController.stop(AudioIds.Spin);
        }
    };

    private onWinPresented = (payload?: { totalWin?: number }): void => {
        if ((payload?.totalWin ?? 0) > 0) {
            AudioController.playSfx(AudioIds.Win);
        }
    };

    private onFeatureTriggered = (): void => {
        AudioController.playSfx(AudioIds.Feature);
    };

    private onFreeSpinStarted = (): void => {
        AudioController.playSfx(AudioIds.FreeSpinStart);
        AudioController.playMusic(AudioIds.BgmFreeSpin);
    };

    private onFreeSpinEnded = (): void => {
        AudioController.playMusic(AudioIds.BgmMain);
    };

    private onInsufficientCoins = (): void => {
        AudioController.playSfx(AudioIds.InsufficientCoins);
    };

    private onRewardClaimed = (): void => {
        AudioController.playSfx(AudioIds.RewardClaim);
    };

    private onJackpotTriggered = (): void => {
        AudioController.playSfx(AudioIds.Feature);
        AudioController.playMusic(AudioIds.BgmFeature);
    };

    private onJackpotCompleted = (): void => {
        AudioController.playSfx(AudioIds.Win);
        AudioController.playMusic(AudioIds.BgmMain);
    };
}
