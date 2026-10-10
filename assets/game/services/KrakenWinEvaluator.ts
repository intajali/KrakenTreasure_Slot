import { IWinEvaluator } from 'db://assets/core/slot/interfaces/IWinEvaluator';
import { ISpinResult, IWinLine } from 'db://assets/core/slot/interfaces/ISpinResult';
import { IBetSelection } from 'db://assets/core/betting/ICoinWallet';
import {
    calculateBonusPayout,
    calculateScatterPayout,
    calculateSymbolPayout,
    isJackpotTrigger,
    isFeatureTrigger,
    PAYLINES_CONFIG,
    PAYTABLE_CONFIG,
    PaylineDefinition,
} from '../paylines/config/PaytableConfig';

interface PaylineWinCandidate {
    readonly symbolId: number;
    readonly count: number;
    readonly payout: number;
}

/** Evaluates configured paylines from left to right. */
export class KrakenWinEvaluator implements IWinEvaluator {
    evaluate(reelWindow: readonly (readonly number[])[], betSelection: IBetSelection): ISpinResult {
        const winLines = PAYLINES_CONFIG.paylines.reduce<IWinLine[]>(
            (lines, payline) => {
                lines.push(...this.evaluatePayline(reelWindow, payline, betSelection));
                return lines;
            },
            [],
        );
        const scatterCount = this.countSymbol(reelWindow, PAYTABLE_CONFIG.specialSymbols.scatter);
        const bonusCount = this.countSymbol(reelWindow, PAYTABLE_CONFIG.specialSymbols.bonus);
        const jackpotSymbolCount = this.countSymbols(reelWindow, PAYTABLE_CONFIG.specialSymbols.jackpots);
        const bonusWin = calculateBonusPayout(bonusCount, betSelection);
        const bonusWinLine = bonusWin > 0
            ? this.createSymbolWinLine(reelWindow, PAYTABLE_CONFIG.specialSymbols.bonus, bonusWin, -2)
            : undefined;
        const featureWin = calculateScatterPayout(scatterCount, betSelection);
        const isFeatureTriggered = winLines.some(line => isFeatureTrigger(line.symbolId, line.count))
            || isFeatureTrigger(PAYTABLE_CONFIG.specialSymbols.scatter, scatterCount);
        const featureWinLine = isFeatureTriggered
            ? this.createSymbolWinLine(reelWindow, PAYTABLE_CONFIG.specialSymbols.scatter, featureWin, -1)
            : undefined;
        const lineWin = winLines.reduce((total, line) => total + line.payout, 0);
        const totalWin = lineWin + bonusWin + featureWin;

        return {
            reelWindow,
            totalWin,
            bonusWin,
            bonusWinLine,
            featureWin,
            featureWinLine,
            winLines,
            isFeatureTriggered,
            featureSymbolCount: scatterCount,
            isJackpotTriggered: isJackpotTrigger(jackpotSymbolCount),
            jackpotSymbolCount,
        };
    }

    private evaluatePayline(
        reelWindow: readonly (readonly number[])[],
        payline: PaylineDefinition,
        betSelection: IBetSelection,
    ): IWinLine[] {
        const symbols = payline.rows.map((row, reel) => reelWindow[reel]?.[row]);
        const candidate = this.getBestPaylineWinCandidate(symbols, betSelection);

        if (!candidate) {
            return [];
        }

        return [{
            lineIndex: payline.lineIndex,
            symbolId: candidate.symbolId,
            count: candidate.count,
            payout: candidate.payout,
            positions: payline.rows
                .slice(0, candidate.count)
                .map((row, reel) => ({ reel, row })),
        }];
    }

    private createSymbolWinLine(
        reelWindow: readonly (readonly number[])[],
        symbolId: number,
        payout: number,
        lineIndex: number,
    ): IWinLine {
        const positions: { reel: number; row: number }[] = [];

        reelWindow.forEach((reel, reelIndex) => {
            reel.forEach((symbol, row) => {
                if (symbol === symbolId) {
                    positions.push({ reel: reelIndex, row });
                }
            });
        });

        return {
            lineIndex,
            symbolId,
            count: positions.length,
            payout,
            positions,
        };
    }

    private getBestPaylineWinCandidate(
        symbols: readonly (number | undefined)[],
        betSelection: IBetSelection,
    ): PaylineWinCandidate | null {
        const wildSymbol = PAYTABLE_CONFIG.specialSymbols.wild;
        let bestCandidate: PaylineWinCandidate | null = null;

        for (const symbolIdText of Object.keys(PAYTABLE_CONFIG.symbolPayouts)) {
            const symbolId = Number(symbolIdText);
            if (!Number.isFinite(symbolId)) {
                continue;
            }

            let matchCount = 0;
            for (const symbol of symbols) {
                if (symbol === undefined || (symbol !== symbolId && symbol !== wildSymbol)) {
                    break;
                }

                matchCount++;
            }

            if (matchCount < PAYTABLE_CONFIG.minMatchCount) {
                continue;
            }

            const payout = calculateSymbolPayout(symbolId, matchCount, betSelection);
            if (payout <= 0) {
                continue;
            }

            if (
                !bestCandidate
                || payout > bestCandidate.payout
                || (payout === bestCandidate.payout && matchCount > bestCandidate.count)
            ) {
                bestCandidate = { symbolId, count: matchCount, payout };
            }
        }

        return bestCandidate;
    }

    private countSymbol(reelWindow: readonly (readonly number[])[], symbolId: number): number {
        return reelWindow.reduce(
            (total, reel) => total + reel.filter(symbol => symbol === symbolId).length,
            0,
        );
    }

    private countSymbols(reelWindow: readonly (readonly number[])[], symbolIds: readonly number[]): number {
        return reelWindow.reduce(
            (total, reel) => total + reel.filter(symbol => symbolIds.indexOf(symbol) >= 0).length,
            0,
        );
    }
}
