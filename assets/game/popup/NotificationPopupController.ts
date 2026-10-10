import { BaseController } from 'db://assets/core/architecture/BaseController';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { BetEvents } from '../betting/BetEvents';
import {
    ButtonType,
    NotificationPopupData,
    NotificationPopupView,
    PopupType,
} from './NotificationPopupView';

export interface InsufficientCoinsPayload {
    readonly balance?: number;
    readonly required?: number;
}

export class NotificationPopupController extends BaseController<NotificationPopupView | null> {
    private readonly onShowRequested = (data: NotificationPopupData): void => this.open(data);

    private readonly onInsufficientCoins = (payload?: InsufficientCoinsPayload): void => {
        const balance = Math.floor(payload?.balance ?? 0);
        const required = Math.floor(payload?.required ?? 0);
        this.open({
            header: PopupType.ERROR,
            message: required > 0
                ? `Insufficient balance: ${balance} for bet: ${required}`
                : 'Insufficient balance to spin.',
            buttons: [{ title: 'OK', buttonType: ButtonType.OK }],
        });
    };

    protected onInitialize(): void {
        if (!this.view) {
            return;
        }
        this.view.initialize();
        this.view.hide();
        EventBus.on(SlotEvents.ShowNotification, this.onShowRequested);
        EventBus.on(BetEvents.InsufficientCoins, this.onInsufficientCoins);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.ShowNotification, this.onShowRequested);
        EventBus.off(BetEvents.InsufficientCoins, this.onInsufficientCoins);
        this.view?.dispose();
    }

    public open(data: NotificationPopupData): void {
        this.view?.open(data);
    }

    public close(): void {
        this.view?.close();
    }
}
