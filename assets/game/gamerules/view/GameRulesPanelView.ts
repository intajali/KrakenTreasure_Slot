import { _decorator, instantiate, Node, Prefab, ScrollView } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
import { RulesItemView } from './RulesItemView';
const { ccclass, property } = _decorator;

@ccclass('GameRulesPanelView')
export class GameRulesPanelView extends BaseView {
    private readonly gameRulesContext: string[] = [
        '1. All bets are placed per spin.',
        '2. The Total Bet is shown on the game interface.',
        '3. Bets cannot be changed during an active spin.',
        '4. Wins are evaluated from left to right, starting from the leftmost reel.',
        '5. Only consecutive symbols count toward a win.',
        '6. All wins from the same spin are added together.',
        '7. Winning combinations are formed by matching symbols on consecutive reels.',
        '8. Winning combinations must follow an active payline.',
        '9. Only the highest win per payline is paid.',
        '10. Multipliers increase the value of winning combinations.',
    ];

    @property({ type: Prefab })
    public itemPrefab: Prefab | null = null;

    @property({ type: Node })
    public contentParent: Node | null = null;

    private generatedItems: Node[] = [];

    protected onInitialize(): void {
        if (!this.itemPrefab || !this.contentParent) {
            console.warn('[GameRulesPanelView] itemPrefab or contentParent is not assigned.');
            return;
        }

        const scrollView = this.node.getChildByName('ScrollView')?.getComponent(ScrollView) ?? null;
        scrollView?.scrollToLeft(0);

        for (let index = 0; index < this.gameRulesContext.length; index++) {
            const itemNode = this.generateItems(index);
            itemNode.active = true;
            itemNode.getComponent(RulesItemView)?.setData(this.gameRulesContext[index], index + 1);
        }
    }

    protected onDispose(): void {
        this.generatedItems.forEach(item => {
            item.getComponent(RulesItemView)?.dispose();
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
