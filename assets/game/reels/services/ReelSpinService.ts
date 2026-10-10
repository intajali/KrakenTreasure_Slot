import { BaseService } from 'db://assets/core/architecture/BaseService';
import { IReel } from 'db://assets/core/reel/interface/IReel';
import { REEL_CONFIG, ReelConfig } from '../config/ReelConfig';

export class ReelSpinService extends BaseService {
    private spinStartTimes = new Map<number, number>();
    private config: ReelConfig = REEL_CONFIG;

    public setConfig(config: ReelConfig): void {
        this.config = config;
    }

    spin(reel: IReel): void {
        this.spinStartTimes.set(reel.id, Date.now());
        reel.spin();
    }

    stop(reel: IReel, stripIndex: number, onComplete?: () => void): void {
        const elapsed = Date.now() - (this.spinStartTimes.get(reel.id) ?? 0);
        const remainingDelay = Math.max(0, this.config.stopDelayMs - elapsed);

        setTimeout(() => {
            reel.stop(stripIndex);
            this.spinStartTimes.delete(reel.id);
            onComplete?.();
        }, remainingDelay);
    }

    dispose(): void {
        this.spinStartTimes.clear();
    }
}
