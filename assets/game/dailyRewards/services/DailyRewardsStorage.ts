import { sys } from 'cc';
import { DailyRewardsPersistedState } from '../model/DailyRewardsModel';
import { DAILY_REWARDS_CONFIG } from '../config/DailyRewardsConfig';

export class DailyRewardsStorage {
    public load(): DailyRewardsPersistedState | null {
        try {
            const raw = sys.localStorage.getItem(DAILY_REWARDS_CONFIG.storageKey);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw) as Partial<DailyRewardsPersistedState>;
            if (
                typeof parsed.weekStartMs !== 'number'
                || typeof parsed.lastClaimMs !== 'number'
                || !Array.isArray(parsed.claimedDayIndexes)
                || !Array.isArray(parsed.weekAwards)
            ) {
                return null;
            }

            return {
                weekStartMs: parsed.weekStartMs,
                lastClaimMs: parsed.lastClaimMs,
                claimedDayIndexes: parsed.claimedDayIndexes.map(Number).filter(Number.isFinite),
                weekAwards: parsed.weekAwards.map(Number).filter(amount => Number.isFinite(amount) && amount >= 0),
            };
        } catch {
            return null;
        }
    }

    public save(state: DailyRewardsPersistedState): void {
        try {
            sys.localStorage.setItem(DAILY_REWARDS_CONFIG.storageKey, JSON.stringify(state));
        } catch {
            // Ignore persistence failures in restricted environments.
        }
    }

    public clear(): void {
        try {
            sys.localStorage.removeItem(DAILY_REWARDS_CONFIG.storageKey);
        } catch {
            // Ignore persistence failures in restricted environments.
        }
    }
}
