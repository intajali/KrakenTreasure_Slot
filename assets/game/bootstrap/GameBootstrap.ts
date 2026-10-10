import { _decorator, Component, Node } from 'cc';
import { SlotGameState } from 'db://assets/core/enums/SlotGameState';
import { StateMachine } from 'db://assets/core/stateMachine/StateMachine';
import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import {
    createDefaultSession,
    ISlotGameSession,
    SpinMode,
} from 'db://assets/core/slot/interfaces/ISlotGameSession';
import { ISlotGameOwner } from 'db://assets/core/slot/interfaces/ISlotGameOwner';
import { ISpinResult } from 'db://assets/core/slot/interfaces/ISpinResult';
import { EventBus, SlotEvents } from 'db://assets/core/events/EventBus';
import { AutoSpinEndReason, AutoSpinEndedPayload } from 'db://assets/core/slot/AutoSpinEndReason';
import { BaseGameReelSetController } from '../reels/controller/BaseGameReelSetController';
import { ReelsContainer } from '../reels/controller/ReelsContainer';
import { SlotGameStateBase } from '../states/SlotGameStateBase';
import { createSlotGameStates, getReadyState } from '../states/SlotGameStateRegistry';
import { BetEvents } from '../betting/BetEvents';
import {
    IDebugSpinOwner,
    SlotDebugController,
} from '../debug/SlotDebugController';
import { JackpotFeatureOpenOptions } from '../jackpot/controller/JackpotFeatureController';
import { JackpotMeterView } from '../jackpot/view/JackpotMeterView';
import { KrakenProgressView } from '../kraken/view/KrakenProgressView';
import { TreasureHuntProgressView } from '../treasurehunt/view/TreasureHuntProgressView';
import { DailyRewardsView } from '../dailyRewards/view/DailyRewardsView';
import { TheoreticalRtpCalculator } from '../math/TheoreticalRtpCalculator';
import { IGamePanelController } from '../ui/IGamePanelController';
import { ProgressFeatureCoordinator } from '../services/ProgressFeatureCoordinator';
import { WinPresentationService } from '../services/WinPresentationService';
import { AddSpinService } from '../freeSpin/services/AddSpinService';
import { createGameServices, GameServices } from './createGameServices';
import { GameFeatureViewBinder } from './GameFeatureViewBinder';
import { GameHelpPagesPanelView } from '../gamerules/view/GameHelpPagesPanelView';
import { GameHelpPagesPanelController } from '../gamerules/controller/GameHelpPagesPanelController';
import { FrontPanelView } from '../ui/FrontPanelView';
import { SpeedMeterView } from '../ui/views/SpeedMeterView';
import { TestModePanelController } from '../gamerules/controller/TestModePanelController';
import { TestModePanelView } from '../gamerules/view/TestModePanelView';
import { JackpotFeatureController } from '../jackpot/controller/JackpotFeatureController';
import { JackpotEvents, JackpotFeatureCompletedPayload } from '../jackpot/JackpotEvents';
import { JackpotFeatureView } from '../jackpot/view/JackpotFeatureView';
import { AudioCueBinder } from 'db://assets/game/audio/AudioCueBinder';
import { AudioManager } from 'db://assets/game/audio/AudioManager';
import { GameSpeedController } from '../settings/GameSpeedController';
import { ParticleManager } from '../particles/ParticleManager';
import { NotificationPopupController } from '../popup/NotificationPopupController';
import { NotificationPopupView } from '../popup/NotificationPopupView';
const { ccclass, property } = _decorator;

/**
 * Composition root: wires services, views, FSM, and reel-set controllers.
 * Domain logic lives in services; reel spin/stop lives on dedicated reel-set controllers.
 */
@ccclass('GameBootstrap')
export class GameBootstrap extends Component implements ISlotGameOwner, IGamePanelController, IDebugSpinOwner {

    /** Base-game reel set (owns ReelsContainer). Assign in inspector or resolved at runtime. */
    @property(BaseGameReelSetController)
    baseReelSet: BaseGameReelSetController | null = null;

    @property(JackpotMeterView)
    jackpotMeterView: JackpotMeterView | null = null;

    @property(JackpotFeatureView)
    jackpotFeatureView: JackpotFeatureView | null = null;

    @property(KrakenProgressView)
    krakenProgressView: KrakenProgressView | null = null;

    @property(TreasureHuntProgressView)
    treasureHuntProgressView: TreasureHuntProgressView | null = null;

    @property(DailyRewardsView)
    dailyRewardsView: DailyRewardsView | null = null;

    @property(FrontPanelView)
    frontPanelView: FrontPanelView | null = null;

    @property(AudioManager)
    audioManager: AudioManager | null = null;

    @property(ParticleManager)
    particleManager: ParticleManager | null = null;

    @property(NotificationPopupView)
    notificationPopupView: NotificationPopupView | null = null;

    @property({ tooltip: 'Auto-start a demo spin after reels are ready.' })
    demoAutoSpin = false;

    @property({ tooltip: 'Enable debug keyboard shortcuts and forced spin outcomes.' })
    debugModeEnabled = false;

    @property({ tooltip: 'Delay between displaying each winning line payout.' })
    winLinePresentationDelayMs = 700;

    public readonly session: ISlotGameSession = createDefaultSession();

    private initialized = false;
    private readonly stateMachine = new StateMachine<SlotGameStateBase>();
    private states = new Map<SlotGameState, SlotGameStateBase>();

    /** Available before bootstrap starts so HUD can query balance/affordability during UI initialization. */
    private readonly services: GameServices = createGameServices();
    private winPresentation: WinPresentationService | null = null;
    private progressFeatures: ProgressFeatureCoordinator | null = null;
    private addSpinService: AddSpinService | null = null;
    private helpPagesController: GameHelpPagesPanelController | null = null;
    private notificationPopupController: NotificationPopupController | null = null;
    private debugController: SlotDebugController | null = null;
    private testmodePanelController: TestModePanelController | null = null;
    private jackpotFeatureController: JackpotFeatureController | null = null;
    private readonly onJackpotFeatureCompleted = (payload: JackpotFeatureCompletedPayload) =>
        this.creditJackpotFeatureWin(payload);

    @property({ type: GameHelpPagesPanelView })
    public gamesHelpPagePanelView: GameHelpPagesPanelView | null = null;

    @property({ type: TestModePanelView })
    public testmodePanelView: TestModePanelView | null = null;

    /** Sole Cocos entry point for the game — everything else uses explicit initialize(). */
    protected start(): void {
        this.initialize();
    }

    public initialize(): void {
        if (this.initialized) {
            return;
        }

        this.initializeAudio();
        this.initializeParticles();
        this.initializeGameSpeed();
        this.initializeGameServices();
        this.initializeGameFlow();
        this.initializeFeatureViews();
        this.initializeUi();

        this.changeState(SlotGameState.Ready);

        if (this.demoAutoSpin) {
            this.scheduleOnce(() => this.requestSpin(), 1.0);
        }

        this.initialized = true;
    }

    private initializeAudio(): void {
        const manager = this.audioManager
            ?? this.getComponent(AudioManager)
            ?? this.findComponentInScene(AudioManager);
        if (!manager) {
            return;
        }

        this.audioManager = manager;
        manager.initialize();
        this.bindAudioCueBinder(manager);
    }

    private bindAudioCueBinder(manager: AudioManager): void {
        const existing = manager.getComponent(AudioCueBinder)
            ?? this.findComponentInScene(AudioCueBinder);
        if (existing) {
            return;
        }

        manager.node.addComponent(AudioCueBinder);
    }

    private initializeParticles(): void {
        const manager = this.particleManager
            ?? this.getComponent(ParticleManager)
            ?? this.findComponentInScene(ParticleManager);
        if (!manager) {
            return;
        }

        this.particleManager = manager;
        manager.initialize();
    }

    private initializeGameSpeed(): void {
        GameSpeedController.initialize();
    }

    private initializeGameServices(): void {
        this.winPresentation = new WinPresentationService({
            getCurrentStateId: () => this.getCurrentStateId(),
            scheduleDelay: (seconds, callback) => this.scheduleDelay(seconds, callback),
            getWinLinePresentationDelayMs: () => this.session.winLinePresentationDelayMs,
            getReelsContainer: () => this.getReelsContainer(),
        });
        this.progressFeatures = new ProgressFeatureCoordinator(
            this.services.krakenProgress,
            this.services.treasureHuntProgress,
            {
                creditWin: amount => this.creditWin(amount),
                getBalance: () => this.getBalance(),
                grantFreeSpins: count => this.grantTreasureHuntFreeSpins(count),
            },
            () => this.getBetSelection(),
            () => this.session.freeSpinActive || this.session.spinMode === SpinMode.FreeSpin,
            () => {
                this.session.pendingTreasureHunt = true;
            },
        );
        this.addSpinService = new AddSpinService({
            getSession: () => this.session,
            getReelsContainer: () => this.getReelsContainer(),
        });

        this.services.betting.initializeSession(this.session);
        this.services.jackpotProgress.initialize();
        this.services.krakenProgress.initialize();
        this.services.treasureHuntProgress.initialize();
        this.services.dailyRewards.initialize();
        this.session.winLinePresentationDelayMs = Math.max(0, this.winLinePresentationDelayMs);
        TheoreticalRtpCalculator.getConfiguredPayoutScale();

        this.winPresentation.register();
        this.progressFeatures.register();
        this.addSpinService.register();
    }

    private initializeGameFlow(): void {
        this.states = createSlotGameStates(this);
        this.stateMachine.initialize();
        this.bindBaseReelSet();
        this.createDebugController();
    }

    private initializeFeatureViews(): void {
        const featureViews = new GameFeatureViewBinder(
            this.node,
            this.services.betting,
            this.services.jackpotProgress,
            this.services.krakenProgress,
            this.services.treasureHuntProgress,
            this.services.dailyRewards,
            {
                jackpotMeterView: this.jackpotMeterView,
                krakenProgressView: this.krakenProgressView,
                treasureHuntProgressView: this.treasureHuntProgressView,
                dailyRewardsView: this.dailyRewardsView,
            },
        );
        featureViews.bindAll();
        const bound = featureViews.getRefs();
        this.jackpotMeterView = bound.jackpotMeterView;
        this.krakenProgressView = bound.krakenProgressView;
        this.treasureHuntProgressView = bound.treasureHuntProgressView;
        this.dailyRewardsView = bound.dailyRewardsView;

        this.bindJackpotFeature();
    }

    /** Base-game reels: use inspector ref, or attach beside ReelsContainer. */
    private bindBaseReelSet(): void {
        let controller = this.baseReelSet
            ?? this.getComponent(BaseGameReelSetController)
            ?? this.findComponentInScene(BaseGameReelSetController);

        if (!controller) {
            const container = this.findComponentInScene(ReelsContainer);
            const host = container?.node ?? this.node;
            controller = host.addComponent(BaseGameReelSetController);
            controller.reelsContainer = container;
        }

        controller.initialize();
        this.baseReelSet = controller;
    }

    private getReelsContainer(): ReelsContainer | null {
        return this.baseReelSet?.reelsContainer ?? null;
    }

    private bindJackpotFeature(): void {
        const view = this.jackpotFeatureView
            ?? this.findComponentInScene(JackpotFeatureView);
        if (!view) {
            return;
        }

        this.jackpotFeatureView = view;

        const controller = view.getComponent(JackpotFeatureController)
            ?? view.node.getComponent(JackpotFeatureController)
            ?? view.node.addComponent(JackpotFeatureController);

        controller.featureView = view;
        controller.initialize();
        this.jackpotFeatureController = controller;

        EventBus.off(JackpotEvents.FeatureCompleted, this.onJackpotFeatureCompleted);
        EventBus.on(JackpotEvents.FeatureCompleted, this.onJackpotFeatureCompleted);
    }

    /** Credits jackpot feature winnings to the balance / free-spin total before exit. */
    private creditJackpotFeatureWin(payload: JackpotFeatureCompletedPayload): void {
        const amount = Math.max(0, Math.floor(payload?.totalWin ?? 0));
        if (amount <= 0) {
            return;
        }

        if (this.session.freeSpinActive) {
            this.session.freeSpinTotalWin += amount;
            EventBus.emit(SlotEvents.FreeSpinUpdated, {
                remaining: this.session.freeSpinsRemaining,
                total: this.session.freeSpinTotal,
                totalWin: this.session.freeSpinTotalWin,
            });
            return;
        }

        this.creditWin(amount);
        EventBus.emit(BetEvents.WinCredited, {
            amount,
            balance: this.getBalance(),
            source: 'jackpotFeature',
        });
        EventBus.emit(SlotEvents.BalanceUpdated, { balance: this.getBalance() });
    }

    private initializeUi(): void {
        if (!this.frontPanelView) {
            this.frontPanelView = this.findComponentInScene(FrontPanelView);
        }

        if (this.frontPanelView) {
            this.frontPanelView.gameHost = this.frontPanelView.gameHost ?? this.node;
            this.frontPanelView.initializePanel();
        }

        this.findComponentInScene(SpeedMeterView)?.initialize();

        this.helpPagesController = new GameHelpPagesPanelController(this.gamesHelpPagePanelView);
        this.helpPagesController.initialize();

        this.notificationPopupController = new NotificationPopupController(this.notificationPopupView);
        this.notificationPopupController.initialize();
    }

    update(dt: number): void {
        this.stateMachine.update(dt);
    }

    onDestroy(): void {
        this.audioManager?.dispose();
        this.particleManager?.dispose();
        this.winPresentation?.unregister();
        this.progressFeatures?.unregister();
        this.addSpinService?.unregister();
        this.debugController?.dispose();
        this.testmodePanelController?.dispose();
        this.helpPagesController?.dispose();
        this.notificationPopupController?.dispose();
        this.baseReelSet?.disposeAll();
        this.jackpotFeatureController?.disposeAll();
        EventBus.off(JackpotEvents.FeatureCompleted, this.onJackpotFeatureCompleted);
        this.debugController = null;
        this.testmodePanelController = null;
        this.helpPagesController = null;
        this.notificationPopupController = null;
        this.baseReelSet = null;
        this.jackpotFeatureController = null;
        this.addSpinService = null;
        this.audioManager = null;
        this.particleManager = null;
        this.stateMachine.dispose();
    }

    // --- ISessionHost ---

    public changeState(stateId: SlotGameState): void {
        const state = this.states.get(stateId);
        if (state) {
            this.stateMachine.changeState(state);
        }
    }

    public scheduleDelay(seconds: number, callback: () => void): void {
        this.scheduleOnce(callback, seconds);
    }

    public getCurrentStateId(): SlotGameState | null {
        return (this.stateMachine.getCurrentState()?.id as SlotGameState) ?? null;
    }

    // --- IBettingHost / IBalanceQuery ---

    public getBalance(): number {
        return this.services.betting.getBalance();
    }

    public getBetSelection(): IBetSelection {
        return this.services.betting.getSelection(this.session);
    }

    public canAffordSpin(): boolean {
        return this.services.betting.canAffordSpin(this.session);
    }

    public shouldChargeCurrentSpin(): boolean {
        return this.services.betting.shouldChargeSpin(this.session);
    }

    public tryDebitSpinCost(): boolean {
        if (!this.services.betting.tryDebitSpinCost(this.session)) {
            return false;
        }

        this.services.spinResults.recordWager(this.session.lastSpinCost);
        this.services.jackpotProgress.contributeFromSpinCost(this.session.lastSpinCost);
        return true;
    }

    public creditWin(amount: number): void {
        this.services.betting.creditWin(amount);
        this.services.spinResults.recordPayout(amount);
    }

    public setBetIndex(index: number): void {
        this.services.betting.setBetIndex(this.session, index);
    }

    public setMultiplierIndex(index: number): void {
        this.services.betting.setMultiplierIndex(this.session, index);
    }

    // --- IJackpotHost ---

    public claimPendingJackpotAward(): number {
        return this.services.jackpotProgress.claimPendingAward();
    }

    public openJackpotFeature(amount = 0, options?: JackpotFeatureOpenOptions): void {
        // Progress bar stays full from trigger until feature entry, then resets.
        this.services.jackpotProgress.resetMeter();
        this.jackpotFeatureController?.open(amount, options);
    }

    // --- IReelFlowHost (delegates to base reel set) ---

    public spinAll(): void {
        this.baseReelSet?.spinAll();
    }

    public stopSequentially(
        stripIndices: number[],
        delayMs: number,
        onComplete?: () => void,
    ): void {
        this.baseReelSet?.stopSequentially(stripIndices, delayMs, onComplete);
    }

    public buildReelWindow(stripIndices: number[]): readonly (readonly number[])[] {
        return this.services.spinResults.buildReelWindow(stripIndices);
    }

    public evaluateSpin(reelWindow: readonly (readonly number[])[], betSelection: IBetSelection): ISpinResult {
        return this.services.spinResults.evaluateSpin(reelWindow, betSelection);
    }

    public selectStopIndices(): number[] {
        return this.services.spinResults.selectStopIndices(this.getBetSelection());
    }

    // --- IBetCommands ---

    public increaseBet(): void {
        this.setBetIndex(this.session.betIndex + 1);
    }

    public decreaseBet(): void {
        this.setBetIndex(this.session.betIndex - 1);
    }

    public increaseMultiplier(): void {
        this.setMultiplierIndex(this.session.multiplierIndex + 1);
    }

    public decreaseMultiplier(): void {
        this.setMultiplierIndex(this.session.multiplierIndex - 1);
    }

    public canIncreaseBet(): boolean {
        return this.services.betting.canIncreaseBet(this.session);
    }

    public canDecreaseBet(): boolean {
        return this.services.betting.canDecreaseBet(this.session);
    }

    public canIncreaseMultiplier(): boolean {
        return this.services.betting.canIncreaseMultiplier(this.session);
    }

    public canDecreaseMultiplier(): boolean {
        return this.services.betting.canDecreaseMultiplier(this.session);
    }

    public setMaxAffordableBet(): void {
        this.services.betting.setMaxAffordableBet(this.session);
    }

    public setMaxBet(): void {
        this.setMaxAffordableBet();
    }

    // --- ISpinCommands ---

    public requestSpin(): void {
        if (this.getCurrentStateId() !== SlotGameState.Ready) {
            return;
        }
        getReadyState(this.states).requestSpin();
    }

    public startAutoSpin(count: number, lossThreshold = 0): void {
        if (!this.canAffordSpin()) {
            EventBus.emit(BetEvents.InsufficientCoins, {
                balance: this.getBalance(),
                required: this.getBetSelection().spinCost,
            });
            return;
        }

        this.session.autoSpinRemaining = count;
        this.session.autoSpinTotal = count;
        this.session.autoSpinStopRequested = false;
        this.session.autoSpinStartBalance = this.getBalance();
        this.session.autoSpinLossThreshold = Math.max(0, lossThreshold);
        this.session.spinMode = SpinMode.AutoSpin;
        this.changeState(SlotGameState.AutoSpin);
    }

    public stopAutoSpin(): void {
        if (!this.isAutoSpinActive()) {
            return;
        }

        this.session.autoSpinStopRequested = true;
        this.session.autoSpinRemaining = 0;
    }

    public endAutoSpin(reason: AutoSpinEndReason = 'completed'): void {
        this.session.autoSpinRemaining = 0;
        this.session.autoSpinTotal = 0;
        this.session.autoSpinStopRequested = false;
        this.session.autoSpinStartBalance = 0;
        this.session.autoSpinLossThreshold = 0;
        this.session.spinMode = SpinMode.Normal;
        EventBus.emit(SlotEvents.AutoSpinEnded, { reason } as AutoSpinEndedPayload);
    }

    public isAutoSpinActive(): boolean {
        return this.session.spinMode === SpinMode.AutoSpin
            || this.session.autoSpinRemaining > 0
            || this.session.autoSpinStopRequested;
    }

    public isAutoSpinLossLimitReached(): boolean {
        const threshold = this.session.autoSpinLossThreshold;
        if (threshold <= 0) {
            return false;
        }

        return this.session.autoSpinStartBalance - this.getBalance() >= threshold;
    }

    public shouldStopAutoSpin(): boolean {
        if (this.session.autoSpinStopRequested) {
            return true;
        }

        return this.isAutoSpinLossLimitReached();
    }

    // --- Debug / free-spin helpers ---

    public startFreeSpins(count: number): void {
        this.session.freeSpinsRemaining = count;
        this.session.freeSpinTotal = count;
        this.session.freeSpinTotalWin = 0;
        this.session.freeSpinActive = false;
        this.session.spinMode = SpinMode.FreeSpin;
        this.changeState(SlotGameState.FreeSpin);
    }

    private grantTreasureHuntFreeSpins(count: number): void {
        const spins = Math.max(0, Math.floor(count));
        if (spins <= 0) {
            return;
        }

        this.scheduleOnce(() => {
            if (this.session.freeSpinActive || this.session.freeSpinsRemaining > 0) {
                this.session.freeSpinsRemaining += spins;
                this.session.freeSpinTotal += spins;
                EventBus.emit(SlotEvents.FreeSpinUpdated, {
                    remaining: this.session.freeSpinsRemaining,
                    total: this.session.freeSpinTotal,
                    totalWin: this.session.freeSpinTotalWin,
                });
                return;
            }
            this.startFreeSpins(spins);
        }, 1.2);
    }

    public setPendingStopIndices(indices: number[]): void {
        this.session.pendingStopIndices = [...indices];
    }

    private createDebugController(): void {
        if (!this.debugModeEnabled) {
            return;
        }

        const debugController = new SlotDebugController(this, this.debugModeEnabled);
        debugController.initialize();
        this.debugController = debugController;

        if (!this.testmodePanelView) {
            return;
        }

        this.testmodePanelController = new TestModePanelController(
            this.testmodePanelView,
            this.debugController,
            () => this.helpPagesController?.close(),
        );
        this.testmodePanelController.initialize();
    }

    private findComponentInScene<T extends Component>(type: new () => T): T | null {
        const scene = this.node.scene;
        if (!scene) {
            return null;
        }

        return this.findComponentInNode(scene, type);
    }

    private findComponentInNode<T extends Component>(node: Node, type: new () => T): T | null {
        const component = node.getComponent(type);
        if (component) {
            return component;
        }

        for (const child of node.children) {
            const match = this.findComponentInNode(child, type);
            if (match) {
                return match;
            }
        }

        return null;
    }
}
