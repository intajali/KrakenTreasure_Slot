import { IResettable, ILifecycle } from '../interfaces/ILifecycle';

export abstract class BaseModel implements ILifecycle, IResettable {
    
    public initialize(): void {}

    public reset(): void {}

    public dispose(): void {
        this.reset();
    }
}
