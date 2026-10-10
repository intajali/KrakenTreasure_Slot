import { _decorator, instantiate, Node, Prefab, ScrollView } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { PAYLINES_CONFIG } from '../../paylines/config/PaytableConfig';
import { PaylineItemView } from './PaylineItemView';
const { ccclass, property } = _decorator;

@ccclass('PaylinesPanelView')
export class PaylinesPanelView extends BaseView {
    @property({ type: Prefab })
    public itemPrefab: Prefab | null = null;

    @property({ type: Node })
    public contentParent: Node | null = null;

    private generatedItems: Node[] = [];

    protected onInitialize(): void {
        if (!this.itemPrefab || !this.contentParent) {
            console.warn('[PaylinesPanelView] itemPrefab or contentParent is not assigned.');
            return;
        }

        const scrollView = this.node.getChildByName('ScrollView')?.getComponent(ScrollView) ?? null;
        scrollView?.scrollToLeft(0);

        const paylines = PAYLINES_CONFIG.paylines;
        for (let index = 0; index < paylines.length; index++) {
            const itemNode = this.generateItems(index);
            itemNode.getComponent(PaylineItemView)?.setData(
                paylines[index].rows,
                paylines[index].lineIndex + 1,
            );
        }
    }

    protected onDispose(): void {
        this.generatedItems.forEach(item => {
            item.getComponent(PaylineItemView)?.dispose();
        });
        this.generatedItems = [];
    }

    private generateItems(index: number): Node {
        if (index < this.generatedItems.length) {
            return this.generatedItems[index];
        }

        const itemNode = instantiate(this.itemPrefab!);
        itemNode.setParent(this.contentParent!);
        itemNode.setScale(1, 1, 1);
        this.generatedItems.push(itemNode);
        return itemNode;
    }
}
