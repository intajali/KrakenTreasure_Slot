export interface IInitializable {
    initialize(): void;
}

export interface IDisposable {
    dispose(): void;
}

export interface IResettable {
    reset(): void;
}

export interface ILifecycle extends IInitializable, IDisposable {}
