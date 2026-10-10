import { SpriteFrame } from "cc";
import { BaseModel } from "db://assets/core/architecture/BaseModel";

export class PaylineItemGridModel extends BaseModel {
    private payindex: number;
    private highlight: SpriteFrame | null = null;
    private df: SpriteFrame | null = null;

    constructor(grid:number , df : SpriteFrame , highlight : SpriteFrame )
    {
        super();
        this.payindex = grid;
        this.df = df;
        this.highlight = highlight;

    }

    public getGrid(): number {
        return this.payindex;
    }

    public getHighlight(): SpriteFrame | null {
        return this.highlight;
    }

    public getDefault(): SpriteFrame | null {
        return this.df;
    }
  
}