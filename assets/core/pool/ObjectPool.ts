export class ObjectPool<T> {
    private readonly pool: T[] = [];

    constructor(
        private readonly factory: () => T,
        private readonly reset?: (item: T) => void,
        initialSize = 0,
    ) {
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.factory());
        }
    }

    public acquire(): T {
        return this.pool.pop() ?? this.factory();
    }

    public release(item: T): void {
        this.reset?.(item);
        this.pool.push(item);
    }

    public clear(): void {
        this.pool.length = 0;
    }

    public get size(): number {
        return this.pool.length;
    }
}
