import { _decorator, Layers, UITransform, Vec3 } from 'cc';
import { BaseReel } from 'db://assets/core/reel/base/BaseReel';
import { BaseReelController } from 'db://assets/core/reel/base/BaseReelController';
import { ReelModel } from '../model/ReelModel';
import { ReelView } from '../view/ReelView';
import { ReelSpinService } from '../services/ReelSpinService';
import { REEL_CONFIG, REEL_ROW_HEIGHT, REEL_WIDTH, ReelConfig } from '../config/ReelConfig';
const { ccclass, property } = _decorator;

const REEL_SPACING = 120;

@ccclass('ReelController')
export class ReelController extends BaseReelController {
    @property({
        type: ReelView,
        tooltip: 'The reel view controlled by this reel.',
    })
    reelView: ReelView | null = null;

    private reelConfig: ReelConfig = REEL_CONFIG;
    private spinService: ReelSpinService | null = null;

    public setup(reelIndex: number, strip: readonly number[], config: ReelConfig = REEL_CONFIG): void {
        this.reelConfig = config;
        this.bindReel(reelIndex);
        this.initialize(reelIndex, strip);
    }

    public applySpinConfig(config: ReelConfig): void {
        this.reelConfig = config;
        this.reelView?.setSpinConfig(config);
        this.spinService?.setConfig(config);
    }

    public static getReelSpacing(): number {
        return REEL_SPACING;
    }

    public getVisibleRowWorldPosition(row: number, out?: Vec3): Vec3 | null {
        return this.resolveReelView().getVisibleRowWorldPosition(row, out);
    }

    public highlightRows(rows: readonly number[]): void {
        this.resolveReelView().highlightRows(rows);
    }

    public clearHighlights(): void {
        this.resolveReelView().clearHighlights();
    }

    public showAddSpinOverlay(row: number, symbolId: number): void {
        this.resolveReelView().showAddSpinOverlay(row, symbolId);
    }

    public clearAddSpinOverlays(): void {
        this.resolveReelView().clearAddSpinOverlays();
    }

    public getLandedSymbolId(): number {
        return this.model.visibleSymbols[0] ?? 0;
    }

    public getStripIndex(): number {
        return this.model.stripIndex;
    }

    public showStickySymbol(row: number, symbolId: number): void {
        this.resolveReelView().showStickySymbol(row, symbolId);
    }

    public clearStickySymbols(): void {
        this.resolveReelView().clearStickySymbols();
    }

    private ensureReelNodeSetup(): void {
        this.node.layer = Layers.Enum.UI_2D;

        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        transform.setContentSize(REEL_WIDTH, this.reelConfig.visibleRows * REEL_ROW_HEIGHT);
    }

    private bindReel(reelIndex: number): void {
        this.ensureReelNodeSetup();

        const view = this.resolveReelView();
        view.setReelIndex(reelIndex);
        view.setSpinConfig(this.reelConfig);

        const service = new ReelSpinService();
        service.setConfig(this.reelConfig);
        this.spinService = service;

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

    protected getVisibleRows(): number {
        return this.reelConfig.visibleRows;
    }

    update(dt: number): void {
        super.update(dt);
    }
}
