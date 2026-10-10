import { IState } from './IState';

export interface IStateMachine<TState extends IState> {
    initialize(): void;
    changeState(state: TState): void;
    update(deltaTime: number): void;
    getCurrentState(): TState | null;
    getPreviousState(): TState | null;
    isCurrentState(stateId: string): boolean;
    clearState(): void;
    dispose(): void;
}
