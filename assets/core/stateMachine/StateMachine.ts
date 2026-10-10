import { BaseStateMachine } from './base/BaseStateMachine';
import { IState } from './interfaces/IState';

export class StateMachine<TState extends IState> extends BaseStateMachine<TState> {}
