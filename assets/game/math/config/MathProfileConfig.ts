import mathProfileConfigData from 'db://assets/resources/math/MathProfileConfig.json';

export interface MathTuningProfile {
    readonly enabled: boolean;
    readonly maxAttempts: number;
    readonly missAcceptanceRate: number;
    readonly lineHitAcceptanceRate: number;
    readonly bonusHitAcceptanceRate: number;
    readonly featureHitAcceptanceRate: number;
    readonly jackpotHitAcceptanceRate: number;
    /**
     * Industry-style theoretical RTP target for this math profile (e.g. 0.96 = 96%).
     * Applied as a fixed payout scale from base paytable EV, not by chasing live RTP.
     */
    readonly targetRtp?: number;
    /** Monte Carlo sample size used to estimate base theoretical RTP. */
    readonly theoreticalSampleSpins?: number;
}

export interface MathProfileConfig {
    readonly activeProfile: string;
    readonly profiles: Record<string, MathTuningProfile>;
}

export const MATH_PROFILE_CONFIG = mathProfileConfigData as MathProfileConfig;

export function getActiveMathProfile(): MathTuningProfile | null {
    const profile = MATH_PROFILE_CONFIG.profiles[MATH_PROFILE_CONFIG.activeProfile];
    return profile?.enabled ? profile : null;
}
