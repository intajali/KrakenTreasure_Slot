import { _decorator, instantiate, Label, Node, Sprite } from 'cc';
import { BaseItemView } from 'db://assets/core/architecture/BaseItemView';
import { PaytableItemDataModel, PaytablePayoutEntry } from '../model/PaytableItemDataModel';
const { ccclass, property } = _decorator;

@ccclass('PaytableItemView')
export class PaytableItemView extends BaseItemView<PaytableItemDataModel> {
    @property({ type: Sprite })
    public symbolSprite: Sprite | null = null;

    @property({ type: Node, tooltip: 'PayValues layout parent that holds payout rows.' })
    public payTableParent: Node | null = null;

    @property({ type: Node, tooltip: 'Template row cloned for each match-count payout.' })
    public paytableValueNode: Node | null = null;

    @property({ type: Label })
    public lbSymbolContext: Label | null = null;

    private generatedValueNodes: Node[] = [];

    protected onSetData(data: PaytableItemDataModel, _index: number): void {
        if (this.symbolSprite) {
            this.symbolSprite.spriteFrame = data.getSymbolSprite();
            this.symbolSprite.enabled = !!data.getSymbolSprite();
        }

        if (this.payTableParent) {
            this.payTableParent.active = true;
        }

        this.renderPayoutEntries(data.getPayoutEntries());
        this.node.active = true;
    }

    private renderPayoutEntries(entries: readonly PaytablePayoutEntry[]): void {
        if (!this.payTableParent || !this.paytableValueNode) {
            return;
        }

        // Keep the template inactive; only generated clones are shown.
        this.paytableValueNode.active = false;

        this.generatedValueNodes.forEach(node => {
            node.active = false;
        });

        for (let index = 0; index < entries.length; index++) {
            const entry = entries[index];
            const rowNode = this.resolveValueNode(index);
            rowNode.active = true;

            const label = rowNode.getComponent(Label)
                ?? rowNode.getComponentInChildren(Label)
                ?? this.lbSymbolContext;
            if (label) {
                label.string = `${entry.matchCount} = ${this.formatPayout(entry.payout)}`;
            }
        }

        // Hide leftover clones when a symbol has fewer tiers than a previous one.
        for (let index = entries.length; index < this.generatedValueNodes.length; index++) {
            this.generatedValueNodes[index].active = false;
        }
    }

    private resolveValueNode(index: number): Node {
        if (index < this.generatedValueNodes.length) {
            return this.generatedValueNodes[index];
        }

        const rowNode = instantiate(this.paytableValueNode!);
        rowNode.setParent(this.payTableParent!);
        rowNode.setScale(1, 1, 1);
        this.generatedValueNodes.push(rowNode);
        return rowNode;
    }

    private formatPayout(payout: number): string {
        return Number.isInteger(payout) ? payout.toFixed(0) : payout.toFixed(2);
    }

    protected onDispose(): void {
        this.generatedValueNodes.forEach(node => {
            node.destroy();
        });
        this.generatedValueNodes = [];

        if (this.paytableValueNode) {
            this.paytableValueNode.active = false;
        }

        super.onDispose();
    }
}
