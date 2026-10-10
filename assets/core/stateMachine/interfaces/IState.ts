
export interface IState {
    readonly id: string;
    enter(): void;
    update(dt: number): void;
    exit(): void;
}
