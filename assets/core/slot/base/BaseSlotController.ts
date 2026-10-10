import { Component, _decorator } from 'cc';
import { StateMachine } from '../../stateMachine/StateMachine';
import { IState } from '../../stateMachine/interfaces/IState';
import { SlotGameState } from '../../enums/SlotGameState';

const { ccclass } = _decorator;

@ccclass('BaseSlotController')
export abstract class BaseSlotController<TState extends IState> extends Component {
    protected readonly stateMachine = new StateMachine<TState>();

    public initializeStateMachine(): void {
        this.stateMachine.initialize();
        this.stateMachine.changeState(this.getInitialState());
    }

    protected update(dt: number): void {
        this.stateMachine.update(dt);
    }

    protected onDestroy(): void {
        this.stateMachine.dispose();
    }

    protected changeGameState(state: TState): void {
        this.stateMachine.changeState(state);
    }

    protected isGameState(stateId: SlotGameState): boolean {
        return this.stateMachine.isCurrentState(stateId);
    }

    protected abstract getInitialState(): TState;
}
