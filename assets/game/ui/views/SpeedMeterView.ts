import { _decorator, EventTouch, Node, Sprite } from 'cc';
import { BaseView } from '../../../core/architecture/BaseView';
import { EventBus } from '../../../core/events/EventBus';
import { GAME_SPEED_CONFIG } from '../../settings/GameSpeedConfig';
import { GameSpeedController } from '../../settings/GameSpeedController';
import { GameSpeedEvents, GameSpeedSnapshot } from '../../settings/GameSpeedEvents';
const { ccclass, property } = _decorator;

@ccclass('SpeedMeterView')
export class SpeedMeterView extends BaseView {
    @property({ type: Sprite })
    speedArrow: Sprite | null = null;

    private dragging = false;
    private needleAngle = GAME_SPEED_CONFIG.meterMinAngle;
    private lastTouchAngle = 0;

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        super.onInitialize();
        this.bindTouch();
        EventBus.on(GameSpeedEvents.Changed, this.onGameSpeedChanged);
        this.applySnapshot(GameSpeedController.getSnapshot());
    }

    protected onDispose(): void {
        this.unbindTouch();
        EventBus.off(GameSpeedEvents.Changed, this.onGameSpeedChanged);
        super.onDispose();
    }

    private bindTouch(): void {
        const node = this.node;
        node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private unbindTouch(): void {
        const node = this.node;
        node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart = (event: EventTouch): void => {
        if (GameSpeedController.getSnapshot().locked) {
            return;
        }

        this.dragging = true;
        this.lastTouchAngle = this.getTouchAngle(event);
        this.needleAngle = GameSpeedController.getSnapshot().meterAngle;
    };

    private onTouchMove = (event: EventTouch): void => {
        if (!this.dragging || GameSpeedController.getSnapshot().locked) {
            return;
        }

        const touchAngle = this.getTouchAngle(event);
        const delta = this.shortestDelta(touchAngle, this.lastTouchAngle);
        this.lastTouchAngle = touchAngle;

        if (Math.abs(delta) > 90) {
            return;
        }

        this.needleAngle = this.clampToSweep(this.needleAngle + delta);
        GameSpeedController.setMeterAngle(this.needleAngle);
        this.setArrowAngle(GameSpeedController.getSnapshot().meterAngle);
    };

    private onTouchEnd = (): void => {
        if (this.dragging && !GameSpeedController.getSnapshot().locked) {
            GameSpeedController.setMeterAngle(this.needleAngle);
        }
        this.dragging = false;
        this.applySnapshot(GameSpeedController.getSnapshot());
    };

    private onGameSpeedChanged = (snapshot: GameSpeedSnapshot): void => {
        if (snapshot.locked) {
            this.dragging = false;
        }
        if (this.dragging) {
            return;
        }
        this.applySnapshot(snapshot);
    };

    private applySnapshot(snapshot: GameSpeedSnapshot): void {
        this.needleAngle = snapshot.meterAngle;
        this.setArrowAngle(snapshot.meterAngle);
    }

    private getTouchAngle(event: EventTouch): number {
        const location = event.getUILocation();
        const pivot = this.speedArrow?.node.worldPosition ?? this.node.worldPosition;
        const dx = location.x - pivot.x;
        const dy = location.y - pivot.y;
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }

    private shortestDelta(to: number, from: number): number {
        let delta = to - from;
        while (delta > 180) {
            delta -= 360;
        }
        while (delta < -180) {
            delta += 360;
        }
        return delta;
    }

    private clampToSweep(angle: number): number {
        const lo = Math.min(GAME_SPEED_CONFIG.meterMinAngle, GAME_SPEED_CONFIG.meterMaxAngle);
        const hi = Math.max(GAME_SPEED_CONFIG.meterMinAngle, GAME_SPEED_CONFIG.meterMaxAngle);
        return Math.min(hi, Math.max(lo, angle));
    }

    private setArrowAngle(angle: number): void {
        if (this.speedArrow) {
            this.speedArrow.node.angle = angle;
        }
    }
}
