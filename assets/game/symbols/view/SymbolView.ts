import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SymbolView')
export class SymbolView extends Component {
    @property({ type: Sprite, tooltip: 'Symbol sprite. Resolved from this node when empty.' })
    sprite: Sprite | null = null;

    private symbolId = -1;

    protected onLoad(): void {
        this.ensureSprite();
    }

    public getSymbolId(): number {
        return this.symbolId;
    }

    public getSprite(): Sprite | null {
        return this.ensureSprite();
    }

    public setSymbol(symbolId: number, frame: SpriteFrame | null): void {
        this.symbolId = symbolId;
        const sprite = this.ensureSprite();
        if (!sprite) {
            return;
        }

        sprite.spriteFrame = frame;
        sprite.enabled = !!frame;
    }

    private ensureSprite(): Sprite | null {
        if (this.sprite?.isValid) {
            return this.sprite;
        }

        this.sprite = this.getComponent(Sprite) ?? this.node.getComponentInChildren(Sprite);
        return this.sprite;
    }
}
