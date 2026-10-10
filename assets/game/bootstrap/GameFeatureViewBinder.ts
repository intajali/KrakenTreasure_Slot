import { Node } from 'cc';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { BetController } from '../betting/BetController';
import { BetEvents } from '../betting/BetEvents';
import { DailyRewardsController } from '../dailyRewards/controller/DailyRewardsController';
import { DailyRewardsView } from '../dailyRewards/view/DailyRewardsView';
import { JackpotProgressController } from '../jackpot/controller/JackpotProgressController';
import { JackpotMeterView } from '../jackpot/view/JackpotMeterView';
import { KrakenProgressController } from '../kraken/controller/KrakenProgressController';
import { KrakenProgressView } from '../kraken/view/KrakenProgressView';
import { TreasureHuntProgressController } from '../treasurehunt/controller/TreasureHuntProgressController';
import { TreasureHuntPopupView } from '../treasurehunt/view/TreasureHuntPopupView';
import { TreasureHuntProgressView } from '../treasurehunt/view/TreasureHuntProgressView';

export interface FeatureViewRefs {
    jackpotMeterView: JackpotMeterView | null;
    krakenProgressView: KrakenProgressView | null;
    treasureHuntProgressView: TreasureHuntProgressView | null;
    dailyRewardsView: DailyRewardsView | null;
}

/** Binds feature meter views in the scene to their controllers. */
export class GameFeatureViewBinder {
    constructor(
        private readonly searchRoot: Node,
        private readonly betting: BetController,
        private readonly jackpotProgress: JackpotProgressController,
        private readonly krakenProgress: KrakenProgressController,
        private readonly treasureHuntProgress: TreasureHuntProgressController,
        private readonly dailyRewards: DailyRewardsController,
        private refs: FeatureViewRefs,
    ) {}

    public bindAll(): void {
        this.setupJackpotMeterView();
        this.setupKrakenProgressView();
        this.setupTreasureHuntProgressView();
        this.setupDailyRewardsView();
    }

    public getRefs(): FeatureViewRefs {
        return this.refs;
    }

    private setupJackpotMeterView(): void {
        const panel = this.refs.jackpotMeterView?.node
            ?? this.findNodeByName(this.searchRoot, 'JackpotPanel');
        if (!panel) {
            return;
        }

        const view = this.refs.jackpotMeterView
            ?? panel.getComponent(JackpotMeterView)
            ?? panel.addComponent(JackpotMeterView);
        this.refs.jackpotMeterView = view;
        view.initialize();
        view.applySnapshot(this.jackpotProgress.getSnapshot());
    }

    private setupKrakenProgressView(): void {
        const panel = this.refs.krakenProgressView?.node
            ?? this.findNodeByName(this.searchRoot, 'KrakenPanel');
        if (!panel) {
            return;
        }

        const view = this.refs.krakenProgressView
            ?? panel.getComponent(KrakenProgressView)
            ?? panel.addComponent(KrakenProgressView);
        this.refs.krakenProgressView = view;
        view.initialize();
        view.applySnapshot(this.krakenProgress.getSnapshot());
    }

    private setupTreasureHuntProgressView(): void {
        const panel = this.refs.treasureHuntProgressView?.node
            ?? this.findNodeByName(this.searchRoot, 'TreasureHuntPanel');
        if (!panel) {
            return;
        }

        const view = this.refs.treasureHuntProgressView
            ?? panel.getComponent(TreasureHuntProgressView)
            ?? panel.addComponent(TreasureHuntProgressView);
        this.refs.treasureHuntProgressView = view;
        view.initialize();
        view.applySnapshot(this.treasureHuntProgress.getSnapshot());

        const popupView = this.resolveTreasureHuntPopupView();
        if (popupView) {
            popupView.initialize();
            popupView.hide();
            view.setTreasureHuntPopupView(popupView);
        }
    }

    private resolveTreasureHuntPopupView(): TreasureHuntPopupView | null {
        const sceneRoot = this.getFeatureViewSceneRoot();
        if (!sceneRoot) {
            return null;
        }

        const popupNode = this.findNodeByName(sceneRoot, 'TreasurehuntPopupView');
        if (!popupNode) {
            return null;
        }

        return popupNode.getComponent(TreasureHuntPopupView)
            ?? popupNode.addComponent(TreasureHuntPopupView);
    }

    /** GameBootstrap has no scene children; resolve UI from the loaded scene graph. */
    private getFeatureViewSceneRoot(): Node | null {
        const anchor = this.refs.treasureHuntProgressView?.node
            ?? this.refs.jackpotMeterView?.node
            ?? this.refs.krakenProgressView?.node
            ?? this.refs.dailyRewardsView?.node;
        return anchor?.scene ?? this.searchRoot.scene ?? null;
    }

    private setupDailyRewardsView(): void {
        const panel = this.refs.dailyRewardsView?.node
            ?? this.findNodeByName(this.searchRoot, 'DailyRewards');
        if (!panel) {
            return;
        }

        const view = this.refs.dailyRewardsView
            ?? panel.getComponent(DailyRewardsView)
            ?? panel.addComponent(DailyRewardsView);
        this.refs.dailyRewardsView = view;
        view.initialize();
        view.setClaimHandler(() => this.claimDailyReward());
        view.applySnapshot(this.dailyRewards.getSnapshot());
    }

    private claimDailyReward(): void {
        const claimed = this.dailyRewards.tryClaim();
        if (!claimed || claimed.amount <= 0) {
            this.refs.dailyRewardsView?.applySnapshot(this.dailyRewards.getSnapshot());
            return;
        }

        // Daily rewards credit balance only — not spin/RTP payout accounting.
        this.betting.creditWin(claimed.amount);
        EventBus.emit(BetEvents.WinCredited, {
            amount: claimed.amount,
            balance: this.betting.getBalance(),
            source: 'dailyRewards',
        });
        EventBus.emit(SlotEvents.BalanceUpdated, { balance: this.betting.getBalance() });
        this.refs.dailyRewardsView?.applySnapshot(claimed.snapshot);
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
}
