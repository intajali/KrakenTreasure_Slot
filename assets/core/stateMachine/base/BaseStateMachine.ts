import { IState } from '../interfaces/IState';
import { IStateMachine } from '../interfaces/IStateMachine';

export abstract class BaseStateMachine<TState extends IState>
    implements IStateMachine<TState> {

    protected currentState: TState | null = null;
    protected previousState: TState | null = null;

    public initialize(): void {}

    public changeState(state: TState): void {
        if (this.currentState === state) {
            return;
        }

        this.currentState?.exit();
        this.previousState = this.currentState;
        this.currentState = state;
        this.currentState.enter();
    }

    public update(deltaTime: number): void {
        this.currentState?.update(deltaTime);
    }

    public getCurrentState(): TState | null {
        return this.currentState;
    }

    public getPreviousState(): TState | null {
        return this.previousState;
    }

    public isCurrentState(stateId: string): boolean {
        return this.currentState?.id === stateId;
    }

    public clearState(): void {
        this.currentState?.exit();
        this.previousState = this.currentState;
        this.currentState = null;
    }

    public dispose(): void {
        this.clearState();
        this.previousState = null;
    }
}
