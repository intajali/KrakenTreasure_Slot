import { ReelState } from '../../enums/ReelState';

export interface IReel {
    readonly id: number;
    readonly state: ReelState;
    initialize(): void;
    spin(): void;
    stop(stripIndex: number): void;
    update(dt: number): void;
    reset(): void;
    dispose(): void;
}
