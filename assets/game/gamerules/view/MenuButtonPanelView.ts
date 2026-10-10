import { _decorator, Enum, Sprite, SpriteFrame, Toggle, ToggleContainer } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import {
    HelpPageId,
    HelpPageSelectedHandler,
    resolveHelpPageIdFromToggleName,
} from '../HelpPageId';
import { MenuButtonItemView } from './MenuButtonItemView';
const { ccclass, property } = _decorator;

@ccclass('GameRuleHeader')
export class GameRuleHeader{

    @property({ type: Enum(HelpPageId) })
    key: HelpPageId;

    @property(SpriteFrame)
    sprite: SpriteFrame | null = null;
}

@ccclass('MenuButtonPanelView')
export class MenuButtonPanelView extends BaseView {
    @property(ToggleContainer)
    toggleGroup: ToggleContainer | null = null;

    @property({type : Sprite})
    headerSprite: Sprite | null = null;

    @property({ type: [GameRuleHeader] })
    gameRuleHeaders: GameRuleHeader[] = [];

    private pageSelectedHandler: HelpPageSelectedHandler | null = null;

    public setPageSelectedHandler(handler: HelpPageSelectedHandler | null): void {
        this.pageSelectedHandler = handler;
    }

    protected onInitialize(): void {
        if (!this.toggleGroup) {
            return;
        }

        this.toggleGroup.toggleItems.forEach(toggle => {
            toggle.node.on(Toggle.EventType.TOGGLE, this.onGroupChanged, this);
        });

        const firstToggle = this.toggleGroup.toggleItems[0];
        if (firstToggle) {
            this.selectIndex(0);
        }
    }

    public selectIndex(index = 0): void {
        const items = this.toggleGroup?.toggleItems;
        if (!items?.length) {
            return;
        }

        const clamped = Math.max(0, Math.min(index, items.length - 1));
        const toggle = items[clamped];
        toggle.isChecked = true;
        this.notifySelection(toggle);
    }

    protected onDispose(): void {
        this.toggleGroup?.toggleItems.forEach(toggle => {
            toggle.node.off(Toggle.EventType.TOGGLE, this.onGroupChanged, this);
        });
        this.pageSelectedHandler = null;
    }

    private onGroupChanged(toggle: Toggle): void {
        if (!toggle.isChecked) {
            return;
        }
        this.notifySelection(toggle);
    }

    private notifySelection(toggle: Toggle): void {
        const pageId = this.resolvePageId(toggle);
        if (pageId === null) {
            return;
        }
        this.setHeaderSprite(pageId);
        this.pageSelectedHandler?.(pageId);
    }

    private setHeaderSprite(pageId: HelpPageId): void {
        if (!this.headerSprite) {
            return;
        }
        const header = this.gameRuleHeaders.find(header => header.key === pageId);
        this.headerSprite.spriteFrame = header?.sprite ?? null;
    }

    private resolvePageId(toggle: Toggle): HelpPageId | null {
        const itemView = toggle.getComponent(MenuButtonItemView);
        if (itemView?.useExplicitPageId) {
            return itemView.resolvePageId();
        }

        return resolveHelpPageIdFromToggleName(toggle.node.name)
            ?? itemView?.resolvePageId()
            ?? null;
    }
}
