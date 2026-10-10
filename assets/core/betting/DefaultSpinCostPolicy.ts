import { SpinMode } from '../slot/interfaces/ISlotGameSession';
import { ISpinCostPolicy } from './ICoinWallet';

export class DefaultSpinCostPolicy implements ISpinCostPolicy {
    shouldCharge(mode: string): boolean {
        return mode !== SpinMode.FreeSpin && mode !== SpinMode.Feature;
    }
}
