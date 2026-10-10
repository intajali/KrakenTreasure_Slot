export type AutoSpinEndReason =
    | 'completed'
    | 'manual_stop'
    | 'loss_limit'
    | 'insufficient_funds'
    | 'feature_triggered';

export interface AutoSpinEndedPayload {
    readonly reason: AutoSpinEndReason;
}
