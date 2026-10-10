import { _decorator, Label, Node } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { AutoSpinFxView } from '../autoSpin/view/AutoSpinFxView';
import { GamePanelResolver } from './GamePanelResolver';
import { IGamePanelController } from './IGamePanelController';
import { CreditBetHudView } from './views/CreditBetHudView';
import { FreeSpinPanelView } from './views/FreeSpinPanelView';
import { SpeedMeterView } from './views/SpeedMeterView';
import { SpinControlsView } from './views/SpinControlsView';
import { WinMeterView } from './views/WinMeterView';
const { ccclass, property } = _decorator;

/**
 * Front-panel coordinator.
 * Wires concern-specific views and refreshes them from the game controller.
 */
@ccclass('FrontPanelView')
export class FrontPanelView extends BaseView {
    @property({ type: Node, tooltip: 'Node containing a component that implements IGamePanelController.' })
    gameHost: Node | null = null;

    @property(CreditBetHudView)
    creditBetHud: CreditBetHudView | null = null;

    @property(WinMeterView)
    winMeter: WinMeterView | null = null;

    @property(SpinControlsView)
    spinControls: SpinControlsView | null = null;

    @property(SpeedMeterView)
    speedMeter: SpeedMeterView | null = null;

    @property(FreeSpinPanelView)
    freeSpinPanel: FreeSpinPanelView | null = null;

    @property(AutoSpinFxView)
    autoSpinFx: AutoSpinFxView | null = null;

    @property({ type: Node, tooltip: 'Shown while auto-spin is active.' })
    autospinCounterNode: Node | null = null;

    @property({ type: Label, tooltip: 'Displays remaining auto-spin count.' })
    spinCountLabel: Label | null = null;

    private game: IGamePanelController | null = null;
    private isWired = false;

    public initializePanel(): void {
        this.node.active = true;
        this.setAutoSpinCounterVisible(false);
        this.bootstrapPanel();
        this.refreshAll();
    }

    onDestroy(): void {
        this.dispose();
    }

    protected onInitialize(): void {
        EventBus.on(SlotEvents.AutoSpinStarted, this.onAutoSpinStarted);
        EventBus.on(SlotEvents.AutoSpinUpdated, this.onAutoSpinUpdated);
        EventBus.on(SlotEvents.AutoSpinEnded, this.onAutoSpinEnded);
    }

    protected onDispose(): void {
        EventBus.off(SlotEvents.AutoSpinStarted, this.onAutoSpinStarted);
        EventBus.off(SlotEvents.AutoSpinUpdated, this.onAutoSpinUpdated);
        EventBus.off(SlotEvents.AutoSpinEnded, this.onAutoSpinEnded);
        this.game = null;
        this.isWired = false;
    }

    private bootstrapPanel(): void {
        this.setAutoSpinCounterVisible(false);

        this.game = this.game ?? GamePanelResolver.resolve(this.gameHost ?? this.node.scene);
        this.wireChildViews();
        this.initialize();
        this.isWired = true;
    }

    private wireChildViews(): void {
        const overlayHost = this.resolveOverlayHost();

        this.creditBetHud = this.ensureView(CreditBetHudView, this.creditBetHud);
        this.creditBetHud.initialize();

        this.winMeter = this.ensureView(WinMeterView, this.winMeter);
        this.winMeter.initialize();

        this.spinControls = this.ensureView(SpinControlsView, this.spinControls);
        this.spinControls.panelHost = this.spinControls.panelHost ?? overlayHost;
        this.spinControls.initialize();
        this.spinControls.setGame(this.game);
        this.spinControls.setBetChangedCallback(() => this.refreshAll());

        this.speedMeter = this.speedMeter?.isValid
            ? this.speedMeter
            : this.getComponentInChildren(SpeedMeterView);
        this.speedMeter?.initialize();

        this.freeSpinPanel = this.ensureView(FreeSpinPanelView, this.freeSpinPanel);
        this.freeSpinPanel.panelHost = this.freeSpinPanel.panelHost ?? overlayHost;
        this.freeSpinPanel.initialize();

        this.autoSpinFx = this.ensureView(AutoSpinFxView, this.autoSpinFx);
        this.autoSpinFx.panelHost = this.autoSpinFx.panelHost ?? overlayHost;
        this.autoSpinFx.initialize();
    }

    private refreshAll(): void {
        if (!this.game) {
            this.game = GamePanelResolver.resolve(this.gameHost ?? this.node.scene);
        }
        if (!this.game) {
            return;
        }

        const { betAmount, multiplier, spinCost } = this.game.getBetSelection();
        this.creditBetHud?.refreshHud(this.game.getBalance(), betAmount, multiplier, spinCost);
        this.winMeter?.refresh();
        this.spinControls?.refreshControlsEnabled();
        this.freeSpinPanel?.refresh();
    }

    private onAutoSpinStarted = (payload?: { remaining?: number; total?: number }): void => {
        this.setAutoSpinCounterVisible(true);
        this.refreshAutoSpinCount(payload?.remaining);
    };

    private onAutoSpinUpdated = (payload?: { remaining?: number; total?: number }): void => {
        this.setAutoSpinCounterVisible(true);
        this.refreshAutoSpinCount(payload?.remaining);
    };

    private onAutoSpinEnded = (): void => {
        this.setAutoSpinCounterVisible(false);
        this.refreshAutoSpinCount(0);
    };

    private setAutoSpinCounterVisible(visible: boolean): void {
        if (this.autospinCounterNode?.isValid) {
            this.autospinCounterNode.active = visible;
        }
    }

    private refreshAutoSpinCount(remaining?: number): void {
        if (!this.spinCountLabel) {
            return;
        }

        const count = Math.max(0, Math.floor(remaining ?? 0));
        this.spinCountLabel.string = `${count}`;
    }

    private ensureView<T extends BaseView>(
        type: abstract new (...args: any[]) => T,
        existing: T | null,
    ): T {
        if (existing?.isValid) {
            return existing;
        }

        // Cocos getComponent/addComponent require a concrete constructor type.
        const concrete = type as unknown as new () => T;
        return this.getComponent(concrete) ?? this.node.addComponent(concrete);
    }

    /** UI overlay parent (Canvas/SafeZone). Do not use gameHost — that is GameBootstrap. */
    private resolveOverlayHost(): Node {
        let current: Node | null = this.node;
        while (current) {
            if (current.name === 'SafeZone' || current.name === 'Canvas') {
                return current;
            }
            current = current.parent;
        }

        return this.node.parent ?? this.node;
    }
}
