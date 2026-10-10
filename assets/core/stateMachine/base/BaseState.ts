import { IState } from '../interfaces/IState';

export abstract class BaseState<TOwner> implements IState {
    public abstract readonly id: string;

    protected readonly owner: TOwner;

    constructor(owner: TOwner) {
        this.owner = owner;
    }

    public enter(): void {}

    public update(_dt: number): void {}

    public exit(): void {}
}
