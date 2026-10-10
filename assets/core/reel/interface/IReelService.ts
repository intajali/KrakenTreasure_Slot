import { IReel } from './IReel';

export interface IReelService {
    spin(reel: IReel): void;
    stop(reel: IReel, stripIndex: number, onComplete?: () => void): void;
    dispose(): void;
}
