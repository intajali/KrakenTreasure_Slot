import { _decorator, Button, Node, UITransform, SpriteFrame, Sprite } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { BetEvents } from '../../betting/BetEvents';
import { AutoSpinSelectionPanelView } from '../../autoSpin/view/AutoSpinSelectionPanelView';
import { ButtonClickBounce } from '../ButtonClickBounce';
import { IGamePanelController } from '../IGamePanelController';
import { UiTween } from '../UiTween';
const { ccclass, property } = _decorator;

@ccclass('SpinControlsView')
export class SpinControlsView extends BaseView {
    @property(Button)
    spinButton: Button | null = null;

    @property(Button)
    autoSpinButton: Button | null = null;

    @property(Button)
    betIncreaseButton: Button | null = null;

    @property(Button)
    betDecreaseButton: Button | null = null;

    @property(Button)
    multiplierIncreaseButton: Button | null = null;

    @property(Button)
    multiplierDecreaseButton: Button | null = null;

    @property(Button)
    maxBetButton: Button | null = null;


    @property(Button)
    menuButton: Button | null = null;

    @property(AutoSpinSelectionPanelView)
    autoSpinSelectionPanel: AutoSpinSelectionPanelView | null = null;

    @property({ type: Node, tooltip: 'Host used when creating the auto-spin selection overlay.' })
    panelHost: Node | null = null;

    @property(SpriteFrame)
    autoSpinDefaultSprite: SpriteFrame | null = null;

    @property(SpriteFrame)
    autoSpinActiveSprite: SpriteFrame | null = null; // auto spin is active  

    @property({ type: Node })
    spinToPlayRoot: Node | null = null;

    @property({ type: Node })
    spinToPlayLabelNode: Node | null = null;

    @property({ tooltip: 'Seconds idle in Ready before showing the spin-to-start panel.' })
    idlePromptDelaySec = 10;
  
    private game: IGamePanelController | null = null;
    private currentState: SlotGameState | null = SlotGameState.Ready;
    private onBetChangedCallback: (() => void) | null = null;
    private isFirstReadyPrompt = true;

    protected onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        this.bindButtons();
        EventBus.on(SlotEvents.StateChanged, this.onStateChanged);
        EventBus.on(SlotEvents.AutoSpinStarted, this.onAutoSpinChanged);
        EventBus.on(SlotEvents.AutoSpinEnded, this.onAutoSpinChanged);
        EventBus.on(BetEvents.InsufficientCoins, this.onInsufficientCoins);
        EventBus.on(SlotEvents.FeatureTriggered, this.onFreeSpinTriggered);
        EventBus.on(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
        this.hideSpinToPlayPrompt();
        this.syncIdlePrompt();
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.StateChanged, this.onStateChanged);
        EventBus.off(SlotEvents.AutoSpinStarted, this.onAutoSpinChanged);
        EventBus.off(SlotEvents.AutoSpinEnded, this.onAutoSpinChanged);
        EventBus.off(BetEvents.InsufficientCoins, this.onInsufficientCoins);
        EventBus.off(SlotEvents.FeatureTriggered, this.onFreeSpinTriggered);
        EventBus.off(SlotEvents.FreeSpinEnded, this.onFreeSpinEnded);
        this.cancelIdlePrompt();
        this.hideSpinToPlayPrompt();
        this.onBetChangedCallback = null;
        this.game = null;
    }
  

    public setGame(game: IGamePanelController | null): void {
        this.game = game;
        this.refreshControlsEnabled();
    }

    public setBetChangedCallback(callback: (() => void) | null): void {
        this.onBetChangedCallback = callback;
    }

    public refreshControlsEnabled(): void {
        const isReady = this.currentState === SlotGameState.Ready;
        const isAutoSpinActive = this.game?.isAutoSpinActive() ?? false;
        const canAfford = this.game?.canAffordSpin() ?? true;
        const canInteract = isReady && canAfford;

        this.setButtonEnabled(this.spinButton, isReady && canAfford);
        this.setButtonEnabled(this.autoSpinButton, canInteract || isAutoSpinActive);
        this.setButtonEnabled(this.maxBetButton, isReady);
        this.setButtonEnabled(this.betDecreaseButton, isReady && (this.game?.canDecreaseBet() ?? false));
        this.setButtonEnabled(this.betIncreaseButton, isReady && (this.game?.canIncreaseBet() ?? false));
        this.setButtonEnabled(
            this.multiplierDecreaseButton,
            isReady && (this.game?.canDecreaseMultiplier() ?? false),
        );
        this.setButtonEnabled(
            this.multiplierIncreaseButton,
            isReady && (this.game?.canIncreaseMultiplier() ?? false),
        );
        this.setButtonEnabled(this.autoSpinButton, canInteract || isAutoSpinActive);

        if (this.autoSpinButton) {
            this.autoSpinButton.node.getComponent(Sprite)!.spriteFrame = isAutoSpinActive
                ? this.autoSpinActiveSprite!
                : this.autoSpinDefaultSprite!;
        }

        if (!isReady) {
            this.cancelIdlePrompt();
            this.hideSpinToPlayPrompt();
        }
    }

    private bindButtons(): void {
        this.bindClick(this.spinButton, this.onSpinClicked);
        this.bindClick(this.autoSpinButton, this.onAutoSpinClicked);
        this.bindClick(this.betIncreaseButton, this.onBetIncreaseClicked);
        this.bindClick(this.betDecreaseButton, this.onBetDecreaseClicked);
        this.bindClick(this.multiplierIncreaseButton, this.onMultiplierIncreaseClicked);
        this.bindClick(this.multiplierDecreaseButton, this.onMultiplierDecreaseClicked);
        this.bindClick(this.maxBetButton, this.onMaxBetClicked);
        this.bindClick(this.menuButton, this.onMenuButtonClicked);
    }

    private bindClick(button: Button | null, handler: () => void): void {
        if (!button) {
            return;
        }
        button.node.on(Button.EventType.CLICK, handler, this);
    }

    private onStateChanged = (payload: { state: SlotGameState }): void => {
        this.currentState = payload.state;
        this.refreshControlsEnabled();
        this.syncIdlePrompt();
    };

    private onAutoSpinChanged = (): void => {
        this.refreshControlsEnabled();
    };

    private onInsufficientCoins = (): void => {
        this.refreshControlsEnabled();
    };

    private onSpinClicked = (): void => {
        ButtonClickBounce.ensure(this.spinButton.node);
        this.game?.requestSpin();
    };

    private onAutoSpinClicked = (): void => {
        ButtonClickBounce.ensure(this.autoSpinButton.node);
        if (!this.game) {
            return;
        }

        if (this.game.isAutoSpinActive()) {
            this.game.stopAutoSpin();
            this.refreshControlsEnabled();
            return;
        }

        if (this.currentState !== SlotGameState.Ready) {
            return;
        }

        const panel = this.ensureAutoSpinSelectionPanel();
        panel.setGame(this.game);
        panel.openPanel();
    };

    private onBetIncreaseClicked = (): void => {
        this.runWhenReady(game => game.increaseBet());
    };

    private onBetDecreaseClicked = (): void => {
        this.runWhenReady(game => game.decreaseBet());
    };

    private onMultiplierIncreaseClicked = (): void => {
        this.runWhenReady(game => game.increaseMultiplier());
    };

    private onMultiplierDecreaseClicked = (): void => {
        this.runWhenReady(game => game.decreaseMultiplier());
    };

    private onMaxBetClicked = (): void => {
        this.runWhenReady(game => game.setMaxAffordableBet());
    };

    private onMenuButtonClicked = (): void => {
        ButtonClickBounce.ensure(this.menuButton.node);
        EventBus.emit(SlotEvents.MenuButtonClicked);
    };

    private onFreeSpinTriggered = (): void => {
        this.setMenuButtonVisible(false);
        this.refreshControlsEnabled();
    };

    private onFreeSpinEnded = (): void => {
        this.setMenuButtonVisible(true);
    };

    private setMenuButtonVisible(visible: boolean): void {
        if (this.menuButton) {
            this.menuButton.node.active = visible;
        }
    }

    private runWhenReady(action: (game: IGamePanelController) => void): void {
        if (!this.game || this.currentState !== SlotGameState.Ready) {
            return;
        }

        action(this.game);
        this.onBetChangedCallback?.();
        this.refreshControlsEnabled();
    }

    private ensureAutoSpinSelectionPanel(): AutoSpinSelectionPanelView {
        if (this.autoSpinSelectionPanel?.isValid && this.isDedicatedAutoSpinPanel(this.autoSpinSelectionPanel)) {
            this.autoSpinSelectionPanel.setGame(this.game);
            return this.autoSpinSelectionPanel;
        }

        const host = this.resolveOverlayHost();
        const existing = host.getComponentsInChildren(AutoSpinSelectionPanelView)
            .find(panel => this.isDedicatedAutoSpinPanel(panel));
        if (existing) {
            this.autoSpinSelectionPanel = existing;
            existing.setGame(this.game);
            existing.initialize();
            return existing;
        }

        const panelNode = new Node('AutoSpinSelectionPanel');
        host.addChild(panelNode);
        panelNode.setSiblingIndex(host.children.length - 1);
        const panel = panelNode.addComponent(AutoSpinSelectionPanelView);
        this.autoSpinSelectionPanel = panel;
        panel.setGame(this.game);
        panel.initialize();
        panel.hide();
        return panel;
    }

    private resolveOverlayHost(): Node {
        if (this.panelHost?.isValid && this.isUiOverlayHost(this.panelHost)) {
            return this.panelHost;
        }

        let current: Node | null = this.node;
        while (current) {
            if (current.name === 'SafeZone' || current.name === 'Canvas') {
                return current;
            }
            current = current.parent;
        }

        return this.node.parent ?? this.node;
    }

    private isUiOverlayHost(node: Node): boolean {
        // GameBootstrap / plain scene nodes are not valid UI parents for the overlay.
        return node.name === 'SafeZone'
            || node.name === 'Canvas'
            || node.getComponent(UITransform) !== null;
    }

    private isDedicatedAutoSpinPanel(panel: AutoSpinSelectionPanelView): boolean {
        // Reject panels attached to nodes that also host front-panel UI or the counter chrome.
        const sharedHost = panel.node.getComponent(SpinControlsView)
            ?? panel.node.getComponent('FrontPanelView')
            ?? panel.node.getComponent('CreditBetHudView')
            ?? panel.node.getComponent('WinMeterView');
        if (sharedHost) {
            return false;
        }

        if (panel.node.name === 'AutoSpinPanelView' || panel.node.name === 'FrontPanelView') {
            return false;
        }

        if (panel.node.getChildByName('AutoSpinCounterBase')) {
            return false;
        }

        return true;
    }

    private setButtonEnabled(button: Button | null, enabled: boolean): void {
        if (button) {
            button.interactable = enabled;
        }
    }

    private syncIdlePrompt(): void {
        if (this.currentState === SlotGameState.Ready) {
            this.hideSpinToPlayPrompt();
            if (this.isFirstReadyPrompt) {
                this.showSpinToPlayPrompt();
                return;
            }
            this.scheduleIdlePrompt();
            return;
        }

        this.isFirstReadyPrompt = false;
        this.cancelIdlePrompt();
        this.hideSpinToPlayPrompt();
    }

    private scheduleIdlePrompt(): void {
        this.cancelIdlePrompt();
        const delay = Math.max(0, this.idlePromptDelaySec);
        this.scheduleOnce(this.onIdlePromptElapsed, delay);
    }

    private cancelIdlePrompt(): void {
        this.unschedule(this.onIdlePromptElapsed);
    }

    private onIdlePromptElapsed = (): void => {
        if (this.currentState !== SlotGameState.Ready) {
            return;
        }
        this.showSpinToPlayPrompt();
    };

    private showSpinToPlayPrompt(): void {
        if (this.spinToPlayRoot) {
            this.spinToPlayRoot.active = true;
        }
        if (this.spinToPlayLabelNode) {
            this.spinToPlayLabelNode.active = true;
            UiTween.pulse(this.spinToPlayLabelNode, {
                peakScale: 1.05,
                upDuration: 0.25,
                downDuration: 0.25,
                pause: 0.5,
            });
        }
    }

    private hideSpinToPlayPrompt(): void {
        if (this.spinToPlayRoot) {
            this.spinToPlayRoot.active = false;
        }
        if (this.spinToPlayLabelNode) {
            this.spinToPlayLabelNode.active = false;
            UiTween.stop(this.spinToPlayLabelNode);
        }
    }
}
