import { IBetSelection } from '../../betting/ICoinWallet';
import { ISpinResult } from '../../slot/interfaces/ISpinResult';

export interface IWinEvaluator {
    evaluate(reelWindow: readonly (readonly number[])[], betSelection: IBetSelection): ISpinResult;
}
