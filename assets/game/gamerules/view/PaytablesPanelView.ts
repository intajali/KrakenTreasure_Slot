import { _decorator, instantiate, Node, Prefab, ScrollView } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { SpriteFrameLibrary } from 'db://assets/core/config/SpriteFrameLibrary';
import { PAYTABLE_CONFIG } from '../../paylines/config/PaytableConfig';
import { PaytableItemDataModel, PaytablePayoutEntry } from '../model/PaytableItemDataModel';
import { PaytableItemView } from './PaytableItemView';
const { ccclass, property } = _decorator;

@ccclass('PaytablesPanelView')
export class PaytablesPanelView extends BaseView {
    @property({ type: Prefab })
    public itemPrefab: Prefab | null = null;

    @property({ type: Node })
    public contentParent: Node | null = null;

    @property({ type: SpriteFrameLibrary, tooltip: 'Optional; falls back to scene SpriteFrameLibrary.' })
    public spriteFrameLibrary: SpriteFrameLibrary | null = null;

    private generatedItems: Node[] = [];
    private scrollView: ScrollView | null = null;

    protected onInitialize(): void {
        this.scrollView = this.node.getChildByName('ScrollView')?.getComponent(ScrollView) ?? null;
        if (this.scrollView) {
            this.scrollView.scrollToLeft(0);
            if (!this.contentParent) {
                this.contentParent = this.scrollView.content;
            }
        }

        const library = this.resolveSpriteFrameLibrary();
        if (!library) {
            this.populateItems(null);
            return;
        }

        this.spriteFrameLibrary = library;
        library.preloadFrames(() => this.populateItems(library));
    }

    protected onDispose(): void {
        this.generatedItems.forEach(item => {
            item.getComponent(PaytableItemView)?.dispose();
        });
        this.generatedItems = [];
    }

    private populateItems(library: SpriteFrameLibrary | null): void {
        if (!this.itemPrefab || !this.contentParent) {
            console.warn('[PaytablesPanelView] itemPrefab or contentParent is not assigned.');
            return;
        }

        const entries = this.buildPaytableEntries();
        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            const itemNode = this.generateItems(index);

            const model = new PaytableItemDataModel();
            model.setSymbolId(entry.symbolId);
            model.setSymbolSprite(library?.getFrame(entry.symbolId) ?? null);
            model.setPayoutEntries(entry.payouts);

            itemNode.getComponent(PaytableItemView)?.setData(model, index);
        }

        // Hide leftover pooled items if the config shrank.
        for (let index = entries.length; index < this.generatedItems.length; index++) {
            this.generatedItems[index].active = false;
        }
    }

    private buildPaytableEntries(): Array<{ symbolId: number; payouts: PaytablePayoutEntry[] }> {
        const payoutScale = PAYTABLE_CONFIG.payoutScale ?? 1;
        const result: Array<{ symbolId: number; payouts: PaytablePayoutEntry[] }> = [];

        const symbolIds = Object.keys(PAYTABLE_CONFIG.symbolPayouts)
            .map(id => Number(id))
            .sort((a, b) => a - b);

        for (const symbolId of symbolIds) {
            const payouts = this.toPayoutEntries(PAYTABLE_CONFIG.symbolPayouts[`${symbolId}`], payoutScale);
            if (payouts.length > 0) {
                result.push({ symbolId, payouts });
            }
        }

        const scatterId = PAYTABLE_CONFIG.specialSymbols.scatter;
        const scatterPayouts = this.toPayoutEntries(PAYTABLE_CONFIG.scatterPayouts, payoutScale);
        if (scatterPayouts.length > 0 && !result.some(entry => entry.symbolId === scatterId)) {
            result.push({ symbolId: scatterId, payouts: scatterPayouts });
        }

        const bonusId = PAYTABLE_CONFIG.specialSymbols.bonus;
        const bonusPayouts = this.toPayoutEntries(PAYTABLE_CONFIG.bonusPayouts, payoutScale);
        if (bonusPayouts.length > 0 && !result.some(entry => entry.symbolId === bonusId)) {
            result.push({ symbolId: bonusId, payouts: bonusPayouts });
        }

        const jackpotPayouts = PAYTABLE_CONFIG.jackpotPayouts;
        if (jackpotPayouts) {
            const jackpotIds = Object.keys(jackpotPayouts)
                .map(id => Number(id))
                .filter(id => Number.isFinite(id))
                .sort((a, b) => a - b);
            for (const symbolId of jackpotIds) {
                const amount = (jackpotPayouts[`${symbolId}`] ?? 0) * payoutScale;
                if (amount <= 0 || result.some(entry => entry.symbolId === symbolId)) {
                    continue;
                }
                result.push({
                    symbolId,
                    payouts: [{ matchCount: 1, payout: amount }],
                });
            }
        }

        return result;
    }

    private toPayoutEntries(
        table: Record<string, number> | undefined,
        payoutScale: number,
    ): PaytablePayoutEntry[] {
        if (!table) {
            return [];
        }

        return Object.keys(table)
            .map(matchCountText => Number(matchCountText))
            .filter(matchCount => Number.isFinite(matchCount))
            .sort((a, b) => a - b)
            .map(matchCount => ({
                matchCount,
                payout: (table[`${matchCount}`] ?? 0) * payoutScale,
            }));
    }

    private generateItems(index: number): Node {
        if (index < this.generatedItems.length) {
            const existing = this.generatedItems[index];
            existing.active = true;
            return existing;
        }

        const itemNode = instantiate(this.itemPrefab!);
        itemNode.setParent(this.contentParent!);
        itemNode.setScale(1, 1, 1);
        itemNode.active = true;
        this.generatedItems.push(itemNode);
        return itemNode;
    }

    private resolveSpriteFrameLibrary(): SpriteFrameLibrary | null {
        if (this.spriteFrameLibrary) {
            return this.spriteFrameLibrary;
        }

        const shared = SpriteFrameLibrary.getShared();
        if (shared) {
            return shared;
        }

        let current: Node | null = this.node;
        while (current) {
            const library = current.getComponent(SpriteFrameLibrary);
            if (library) {
                return library;
            }
            current = current.parent;
        }

        const scene = this.node.scene;
        if (!scene) {
            return null;
        }

        const stack: Node[] = [...scene.children];
        while (stack.length > 0) {
            const node = stack.pop()!;
            const library = node.getComponent(SpriteFrameLibrary);
            if (library) {
                return library;
            }
            stack.push(...node.children);
        }

        return null;
    }
}
