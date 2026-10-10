import { DefaultSpinCostPolicy } from 'db://assets/core/betting/DefaultSpinCostPolicy';
import { BetCalculator } from '../betting/BetCalculator';
import { BET_CONFIG } from '../betting/BetConfig';
import { BetController } from '../betting/BetController';
import { CoinWallet } from '../betting/CoinWallet';
import { DailyRewardsController } from '../dailyRewards/controller/DailyRewardsController';
import { DailyRewardsModel } from '../dailyRewards/model/DailyRewardsModel';
import { DailyRewardsStorage } from '../dailyRewards/services/DailyRewardsStorage';
import { JackpotProgressController } from '../jackpot/controller/JackpotProgressController';
import { JackpotProgressModel } from '../jackpot/model/JackpotProgressModel';
import { KrakenProgressController } from '../kraken/controller/KrakenProgressController';
import { KrakenProgressModel } from '../kraken/model/KrakenProgressModel';
import { MathOutcomeSelector } from '../math/MathOutcomeSelector';
import { RtpTracker } from '../math/RtpTracker';
import { KrakenWinEvaluator } from '../services/KrakenWinEvaluator';
import { SpinResultController } from '../services/SpinResultController';
import { TreasureHuntProgressController } from '../treasurehunt/controller/TreasureHuntProgressController';
import { TreasureHuntProgressModel } from '../treasurehunt/model/TreasureHuntProgressModel';

export interface GameServices {
    readonly betting: BetController;
    readonly spinResults: SpinResultController;
    readonly jackpotProgress: JackpotProgressController;
    readonly krakenProgress: KrakenProgressController;
    readonly treasureHuntProgress: TreasureHuntProgressController;
    readonly dailyRewards: DailyRewardsController;
 
}

/** Composition-root factory: constructs the game service graph with explicit DI. */
export function createGameServices(): GameServices {
    const betting = new BetController(
        new CoinWallet(BET_CONFIG.startingCoins),
        new BetCalculator(),
        new DefaultSpinCostPolicy(),
    );

    const spinResults = new SpinResultController(
        new KrakenWinEvaluator(),
        new MathOutcomeSelector(),
        new RtpTracker(),
    );

    const jackpotProgress = new JackpotProgressController(new JackpotProgressModel());
    const krakenProgress = new KrakenProgressController(new KrakenProgressModel());
    const treasureHuntProgress = new TreasureHuntProgressController(new TreasureHuntProgressModel());
    const dailyRewards = new DailyRewardsController(new DailyRewardsModel(), new DailyRewardsStorage());

    return {
        betting,
        spinResults,
        jackpotProgress,
        krakenProgress,
        treasureHuntProgress,
        dailyRewards,
    };
}
