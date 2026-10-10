import { IReel } from './IReel';

export interface IReelFactory {
    create(index: number): IReel;
}
