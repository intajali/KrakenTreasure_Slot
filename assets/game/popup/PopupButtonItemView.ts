import { _decorator, Button, Label, Sprite } from 'cc';
import { BaseItemView } from '../../core/architecture/BaseItemView';
import { EventBus, SlotEvents } from '../../core/events/EventBus';
import { ButtonClickBounce } from '../ui/ButtonClickBounce';
import { PopupButtonItemData } from './NotificationPopupView';
const { ccclass, property } = _decorator;

@ccclass('PopupButtonItemView')
export class PopupButtonItemView extends BaseItemView<PopupButtonItemData> {
    @property(Label)
    private titleLabel: Label | null = null;

    @property(Button)
    private buttonComponent: Button | null = null;

    @property(Sprite)
    private buttonSprite: Sprite | null = null;

    protected onInitialize(): void {
        super.onInitialize();
        this.buttonComponent = this.buttonComponent ?? this.getComponent(Button);
        this.buttonSprite = this.buttonSprite
            ?? this.buttonComponent?.getComponent(Sprite)
            ?? this.getComponent(Sprite);
        this.titleLabel = this.titleLabel ?? this.getComponentInChildren(Label);

        if (this.buttonComponent) {
            ButtonClickBounce.ensure(this.buttonComponent.node);
            this.buttonComponent.node.on(Button.EventType.CLICK, this.onClick, this);
        }
    }

    protected onSetData(data: PopupButtonItemData): void {
        if (this.titleLabel) {
            this.titleLabel.string = data.title;
        }
        if (this.buttonSprite && data.buttonSprite) {
            this.buttonSprite.spriteFrame = data.buttonSprite;
        }
    }

    private onClick(): void {
        if (!this.data) {
            return;
        }
        EventBus.emit(SlotEvents.PopupButtonItemClicked, this.data.buttonType);
    }

    protected onDispose(): void {
        this.buttonComponent?.node.off(Button.EventType.CLICK, this.onClick, this);
        super.onDispose();
    }
}
