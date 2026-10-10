export interface ObservedRtpSnapshot {
    readonly totalWagered: number;
    readonly totalPaid: number;
    readonly wageredSpinCount: number;
    /** Observed RTP = totalPaid / totalWagered. Industry accounting identity. */
    readonly observedRtp: number;
}

/**
 * Industry-standard observed RTP accounting.
 * RTP = sum(all player wins including features/free spins) / sum(all player wagers).
 * This is reporting only and must not steer outcomes.
 */
export class RtpTracker {
    private totalWagered = 0;
    private totalPaid = 0;
    private wageredSpinCount = 0;

    public recordWager(amount: number): void {
        if (amount <= 0) {
            return;
        }

        this.totalWagered += amount;
        this.wageredSpinCount++;
    }

    public recordPayout(amount: number): void {
        if (amount <= 0) {
            return;
        }

        this.totalPaid += amount;
    }

    public getSnapshot(): ObservedRtpSnapshot {
        return {
            totalWagered: this.totalWagered,
            totalPaid: this.totalPaid,
            wageredSpinCount: this.wageredSpinCount,
            observedRtp: this.getObservedRtp(),
        };
    }

    public getObservedRtp(): number {
        if (this.totalWagered <= 0) {
            return 0;
        }

        return this.totalPaid / this.totalWagered;
    }

    public reset(): void {
        this.totalWagered = 0;
        this.totalPaid = 0;
        this.wageredSpinCount = 0;
    }
}
