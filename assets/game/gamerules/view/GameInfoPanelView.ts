import { _decorator, Label } from 'cc';
import { BaseView } from 'db://assets/core/architecture/BaseView';
const { ccclass, property } = _decorator;

@ccclass('GameInfoPanelView')
export class GameInfoPanelView extends BaseView {

private readonly gameInfo: string = `Winning Rules
Wins are paid from left to right.
Multiple paylines can win in a single spin.
The highest win per payline is awarded.
All payouts are based on the total bet.

Special Features

Scatter symbols award Free Spins.
Wild symbols substitute for regular symbols.
Bonus symbols trigger the Bonus Game.
Jackpot prizes may be awarded during eligible features.
Gamble feature allows qualifying wins to be doubled.

Game Information

RTP: 96.20% (or your configured RTP)
Volatility: High
Outcomes are determined by a certified Random Number Generator (RNG).
Each spin is independent and previous results do not affect future outcomes.

Responsible Gaming
Play responsibly and within your limits. This game is intended for players of legal gambling age in their jurisdiction.`;

   @property({type:Label})
   public gameInfoLabel: Label | null = null;
    
    protected onInitialize(): void {
       if(this.gameInfoLabel) {
        this.gameInfoLabel.string = this.gameInfo;
       }
        
    }

    protected onDispose(): void {
       if(this.gameInfoLabel) {
        this.gameInfoLabel.string = '';
       }
    }
  
}   
