import { _decorator } from 'cc';
import { BaseReelController } from 'db://assets/core/reel/base/BaseReelController';
import { BaseReel } from 'db://assets/core/reel/base/BaseReel';
import { ReelView } from '../view/ReelView';
import { ReelModel } from '../model/ReelModel';
import { ReelSpinService } from '../services/ReelSpinService';
import { ReelConfig } from '../config/ReelConfig';
import { JACKPOT_FINAL_REEL_CONFIG } from '../../jackpot/config/JackpotReelConfig';
const { ccclass, property } = _decorator;

@ccclass('JackpotReelController')
export class JackpotReelController extends BaseReelController {
    @property({ type: ReelView })
    public reelView: ReelView | null = null;

    private reelConfig: ReelConfig = JACKPOT_FINAL_REEL_CONFIG;

    public setup(
        reelIndex: number,
        strip: readonly number[],
        config: ReelConfig = JACKPOT_FINAL_REEL_CONFIG,
    ): void {
        this.reelConfig = config;
        this.bindReel(reelIndex);
        this.initialize(reelIndex, strip);
    }

    /** Center visible symbol (or first when only one row is visible). */
    public getLandedSymbolId(): number {
        const symbols = this.model.visibleSymbols;
        if (!symbols.length) {
            return 0;
        }
        const centerIndex = Math.floor(symbols.length / 2);
        return symbols[centerIndex] ?? symbols[0] ?? 0;
    }

    public getLandedRowIndex(): number {
        const rows = Math.max(1, this.reelConfig.visibleRows);
        return Math.floor(rows / 2);
    }

    public playLandReveal(durationSec: number, onComplete?: () => void): void {
        this.resolveReelView().playLandReveal(this.getLandedRowIndex(), durationSec, onComplete);
    }

    public clearHighlights(): void {
        this.resolveReelView().clearHighlights();
    }

    public getStripIndex(): number {
        return this.model.stripIndex;
    }

    protected getVisibleRows(): number {
        return this.reelConfig.visibleRows;
    }

    protected onDispose(): void {}

    private bindReel(reelIndex: number): void {
        const view = this.resolveReelView();
        view.setReelIndex(reelIndex);
        view.setSpinConfig(this.reelConfig);

        const service = new ReelSpinService();
        service.setConfig(this.reelConfig);

        const model = new ReelModel(this.reelConfig.visibleRows);
        model.setVisibleRows(this.reelConfig.visibleRows);

        this.bind(new BaseReel(reelIndex), model, view, service);
    }

    private resolveReelView(): ReelView {
        if (!this.reelView) {
            this.reelView = this.getComponent(ReelView) ?? this.addComponent(ReelView);
        }

        return this.reelView;
    }
}
