import { EventKeyboard, input, Input } from 'cc';
import debugSpinConfigData from 'db://assets/resources/debug/DebugSpinConfig.json';
import { JACKPOT_CONFIG } from '../jackpot/config/JackpotConfig';
import { JackpotFeatureOpenOptions } from '../jackpot/controller/JackpotFeatureController';
import { TestModeItemType } from '../gamerules/view/TestModePanelView';
import { ButtonType, PopupType } from '../popup/NotificationPopupView';
import { EventBus, SlotEvents } from '../betting/BetEvents';
import { ParticleController } from '../particles/ParticleController';
import { ParticleIds } from '../particles/ParticleIds';

interface DebugSpinScenario {
    readonly id: string;
    readonly label: string;
    readonly stopIndices: readonly number[];
}

interface DebugSpinConfig {
    readonly scenarios: readonly DebugSpinScenario[];
}

export interface IDebugSpinOwner {
    setPendingStopIndices(indices: number[]): void;
    requestSpin(): void;
    openJackpotFeature(amount?: number, options?: JackpotFeatureOpenOptions): void;
}

const DEBUG_SPIN_CONFIG = debugSpinConfigData as DebugSpinConfig;

const KEY_CODE_1 = 49;
const KEY_CODE_2 = 50;
const KEY_CODE_3 = 51;
const KEY_CODE_4 = 52;
const KEY_CODE_5 = 53;
const KEY_CODE_6 = 54;
const KEY_CODE_7 = 55;

const TEST_JACKPOT_AWARDS: Readonly<Partial<Record<TestModeItemType, number>>> = {
    [TestModeItemType.TRIGGER_JACKPOT]: JACKPOT_CONFIG.triggerValue,
    [TestModeItemType.JACKPOT_SIX_PEARLS]: JACKPOT_CONFIG.triggerValue,
    [TestModeItemType.JACKPOT_MINI]: Math.max(50, Math.floor(JACKPOT_CONFIG.triggerValue * 0.5)),
    [TestModeItemType.JACKPOT_MAXI]: JACKPOT_CONFIG.triggerValue,
    [TestModeItemType.JACKPOT_MEGA]: Math.floor(JACKPOT_CONFIG.triggerValue * 2),
    [TestModeItemType.JACKPOT_GRAND]: Math.floor(JACKPOT_CONFIG.triggerValue * 4),
};

export class SlotDebugController {
    private readonly handleKeyDown = (event: EventKeyboard) => this.onKeyDown(event);
    private initialized = false;

    constructor(
        private readonly game: IDebugSpinOwner,
        private readonly debugModeEnabled = true,
        private readonly keyboardShortcutsEnabled = true,
    ) {
    }

    public initialize(): void {
        if (this.initialized) {
            return;
        }
        input.on(Input.EventType.KEY_DOWN, this.handleKeyDown, this);
        this.initialized = true;
    }

    public dispose(): void {
        if (!this.initialized) {
            return;
        }
        input.off(Input.EventType.KEY_DOWN, this.handleKeyDown, this);
        this.initialized = false;
    }

    public triggerLineWin(): void {
        this.triggerScenario('lineWin');
    }

    public triggerWildWin(): void {
        this.triggerScenario('wildWin');
    }

    public triggerBonusWin(): void {
        this.triggerScenario('bonusWin');
    }

    public triggerFreeSpins(): void {
        this.triggerScenario('freeSpinTrigger');
    }

    public triggerJackpot(
        amount = JACKPOT_CONFIG.triggerValue,
        options?: JackpotFeatureOpenOptions,
    ): void {
        if (!this.debugModeEnabled) {
            return;
        }
        this.game.openJackpotFeature(Math.max(0, Math.floor(amount)), options);
    }

    public triggerJackpotSixPearls(amount = JACKPOT_CONFIG.triggerValue): void {
        this.triggerJackpot(amount, { forceSixPearls: true });
    }

    public triggerJackpotTier(
        tier: 'MINI' | 'MAXI' | 'MEGA' | 'GRAND',
        amount = JACKPOT_CONFIG.triggerValue,
    ): void {
        this.triggerJackpot(amount, {
            forceSixPearls: true,
            forceFinalReelTier: tier,
        });
    }

    public triggerScenarioByItemType(itemType: TestModeItemType): void {
        switch (itemType) {
            case TestModeItemType.BASE_WIN:
                this.triggerLineWin();
                return;
            case TestModeItemType.WILD_WIN:
                this.triggerWildWin();
                return;
            case TestModeItemType.BONUS_WIN:
                this.triggerBonusWin();
                return;
            case TestModeItemType.SCATTER_WIN:
                this.triggerFreeSpins();
                return;
            case TestModeItemType.JACKPOT_SIX_PEARLS:
                this.triggerJackpotSixPearls(TEST_JACKPOT_AWARDS[itemType]);
                return;
            case TestModeItemType.JACKPOT_MINI:
                this.triggerJackpotTier('MINI', TEST_JACKPOT_AWARDS[itemType]);
                return;
            case TestModeItemType.JACKPOT_MAXI:
                this.triggerJackpotTier('MAXI', TEST_JACKPOT_AWARDS[itemType]);
                return;
            case TestModeItemType.JACKPOT_MEGA:
                this.triggerJackpotTier('MEGA', TEST_JACKPOT_AWARDS[itemType]);
                return;
            case TestModeItemType.JACKPOT_GRAND:
                this.triggerJackpotTier('GRAND', TEST_JACKPOT_AWARDS[itemType]);
                return;
            case TestModeItemType.TRIGGER_JACKPOT:
                this.triggerJackpot(TEST_JACKPOT_AWARDS[itemType] ?? JACKPOT_CONFIG.triggerValue);
                return;
            default:
                console.warn(`Unsupported debug item: ${itemType}`);
        }
    }

    public triggerScenario(scenarioId: string): void {
        if (!this.debugModeEnabled) {
            return;
        }

        const scenario = DEBUG_SPIN_CONFIG.scenarios.find(s => s.id === scenarioId);
        if (!scenario) {
            console.warn(`Scenario not found: ${scenarioId}`);
            return;
        }

        this.game.setPendingStopIndices([...scenario.stopIndices]);
        this.game.requestSpin();
    }

    private onKeyDown(event: EventKeyboard): void {
        if (!this.debugModeEnabled || !this.keyboardShortcutsEnabled) {
            return;
        }

        switch (event.keyCode) {
            case KEY_CODE_1:
                this.triggerLineWin();
                break;
            case KEY_CODE_2:
                this.triggerWildWin();
                break;
            case KEY_CODE_3:
                this.triggerBonusWin();
                break;
            case KEY_CODE_4:
                this.triggerFreeSpins();
                break;
            case KEY_CODE_5:
                this.triggerJackpot();
                break;
            case KEY_CODE_6:
                this.triggerJackpotSixPearls();
                break;
            case KEY_CODE_7:
                ParticleController.play(ParticleIds.BarFilled);
                break;
        }
    }
}
