import { _decorator, Button, Node } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { HelpPageId, HelpPageSelectedHandler } from '../HelpPageId';
import { MenuButtonPanelView } from './MenuButtonPanelView';
import { GameRulesPanelView } from './GameRulesPanelView';
import { PaytablesPanelView } from './PaytablesPanelView';
import { PaylinesPanelView } from './PaylinesPanelView';
import { GameSettingsPanelView } from './GameSettingsPanelView';
import { TestModePanelView } from './TestModePanelView';
import { GameInfoPanelView } from './GameInfoPanelView';
const { ccclass, property } = _decorator;

export type GameHelpPagesCloseHandler = () => void;

@ccclass('GameHelpPagesPanelView')
export class GameHelpPagesPanelView extends BaseView {
    @property(Button)
    public buttonClose: Button | null = null;

    @property({ type: MenuButtonPanelView })
    public menuButtonPanelView: MenuButtonPanelView | null = null;

    @property({ type: GameRulesPanelView })
    public gamerulesPanelView: GameRulesPanelView | null = null;

    @property({ type: PaytablesPanelView })
    public paytablesPanelView: PaytablesPanelView | null = null;

    @property({ type: PaylinesPanelView })
    public paylinesPanelView: PaylinesPanelView | null = null;

    @property({ type: GameSettingsPanelView })
    public gameSettingsPanelView: GameSettingsPanelView | null = null;

    @property({ type: TestModePanelView })
    public gameTestModePanelView: TestModePanelView | null = null;

    @property({ type: GameInfoPanelView })
    public gameInfoPanelView: GameInfoPanelView | null = null;

    private readonly contentPages = new Map<HelpPageId, BaseView>();
    private closeHandler: GameHelpPagesCloseHandler | null = null;
    private activePageId: HelpPageId | null = null;

    public setCloseHandler(handler: GameHelpPagesCloseHandler | null): void {
        this.closeHandler = handler;
    }

    public setPageSelectedHandler(handler: HelpPageSelectedHandler | null): void {
        this.menuButtonPanelView?.setPageSelectedHandler(handler);
    }

    protected onInitialize(): void {
        this.resolveCloseButton();

        this.contentPages.clear();
        if (this.gamerulesPanelView) {
            this.contentPages.set(HelpPageId.Rules, this.gamerulesPanelView);
        }
        if (this.paytablesPanelView) {
            this.contentPages.set(HelpPageId.Paytables, this.paytablesPanelView);
        }
        if (this.paylinesPanelView) {
            this.contentPages.set(HelpPageId.Paylines, this.paylinesPanelView);
        }
        if (this.gameSettingsPanelView) {
            this.contentPages.set(HelpPageId.Settings, this.gameSettingsPanelView);
        }
        if (this.gameTestModePanelView) {
            this.contentPages.set(HelpPageId.TestMode, this.gameTestModePanelView);
        }
        if (this.gameInfoPanelView) {
            this.contentPages.set(HelpPageId.Info, this.gameInfoPanelView);
        }

        this.contentPages.forEach(view => view.initialize());
        this.menuButtonPanelView?.initialize();

        if (this.buttonClose) {
            this.buttonClose.node.on(Button.EventType.CLICK, this.onCloseButtonClicked, this);
        }
    }

    public show(): void {
        this.node.active = true;
        this.menuButtonPanelView?.selectIndex(0);
    }

    public showHelpPage(pageId: HelpPageId): void {
        this.activePageId = pageId;

        this.contentPages.forEach((view, id) => {
            if (id === pageId) {
                view.show();
            } else {
                view.hide();
            }
        });
    }

    public getActivePageId(): HelpPageId | null {
        return this.activePageId;
    }

    private onCloseButtonClicked(): void {
        if (this.closeHandler) {
            this.closeHandler();
            return;
        }
        this.hide();
    }

    private resolveCloseButton(): void {
        if (this.buttonClose) {
            return;
        }

        const closeNode = this.findNodeByName(this.node, 'ButtonClose');
        this.buttonClose = closeNode?.getComponent(Button) ?? null;
    }

    private findNodeByName(root: Node, name: string): Node | null {
        if (root.name === name) {
            return root;
        }

        for (const child of root.children) {
            const match = this.findNodeByName(child, name);
            if (match) {
                return match;
            }
        }

        return null;
    }

    protected onDispose(): void {
        if (this.buttonClose) {
            this.buttonClose.node.off(Button.EventType.CLICK, this.onCloseButtonClicked, this);
        }

        this.menuButtonPanelView?.dispose();
        this.contentPages.forEach(view => view.dispose());
        this.contentPages.clear();
        this.activePageId = null;
        this.closeHandler = null;
    }
}
