import { _decorator } from 'cc';
import { EventBus } from 'db://assets/core/events/EventBus';
import { BaseReelSetController } from 'db://assets/core/slot/base/BaseReelSetController';
import { IReelController } from 'db://assets/core/reel/interface/IReelController';
import { GameSpeedController } from '../../settings/GameSpeedController';
import { GameSpeedEvents, GameSpeedSnapshot } from '../../settings/GameSpeedEvents';
import { ReelsContainer } from './ReelsContainer';
const { ccclass, property } = _decorator;

/**
 * Owns the base-game reel set (spin / stop / update) and its ReelsContainer.
 * Wired by GameBootstrap; not a composition root.
 */
@ccclass('BaseGameReelSetController')
export class BaseGameReelSetController extends BaseReelSetController {
    @property(ReelsContainer)
    public reelsContainer: ReelsContainer | null = null;

    protected onInitialize(): void {
        this.resolveReelsContainer();
        this.createReels();
        EventBus.on(GameSpeedEvents.Changed, this.onGameSpeedChanged);
    }

    protected onDestroy(): void {
        EventBus.off(GameSpeedEvents.Changed, this.onGameSpeedChanged);
        this.disposeAll();
    }

    public createReels(): void {
        this.resolveReelsContainer();
        if (!this.reelsContainer) {
            return;
        }

        const controllers = this.reelsContainer.initializeReels(GameSpeedController.buildReelConfig());
        this.setReels(controllers as IReelController[]);
    }

    private onGameSpeedChanged = (_snapshot: GameSpeedSnapshot): void => {
        const config = GameSpeedController.buildReelConfig();
        this.reelsContainer?.reelControllers.forEach(reel => {
            reel.applySpinConfig(config);
        });
    }

    private resolveReelsContainer(): void {
        if (this.reelsContainer?.isValid) {
            return;
        }

        this.reelsContainer = this.getComponent(ReelsContainer)
            ?? this.node.getComponentInChildren(ReelsContainer);
    }
}
