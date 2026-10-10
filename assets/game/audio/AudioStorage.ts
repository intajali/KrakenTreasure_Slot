import { sys } from 'cc';
import { AUDIO_CONFIG } from './AudioConfig';
import { AudioSettingsSnapshot } from './AudioEvents';

export class AudioStorage {
    public load(): AudioSettingsSnapshot | null {
        try {
            const raw = sys.localStorage.getItem(AUDIO_CONFIG.storageKey);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw) as Partial<AudioSettingsSnapshot>;
            if (
                typeof parsed.musicVolume !== 'number'
                || typeof parsed.sfxVolume !== 'number'
                || typeof parsed.muted !== 'boolean'
            ) {
                return null;
            }

            return {
                musicVolume: this.clamp(parsed.musicVolume),
                sfxVolume: this.clamp(parsed.sfxVolume),
                muted: parsed.muted,
            };
        } catch {
            return null;
        }
    }

    public save(settings: AudioSettingsSnapshot): void {
        try {
            sys.localStorage.setItem(AUDIO_CONFIG.storageKey, JSON.stringify(settings));
        } catch {
            // Ignore persistence failures in restricted environments.
        }
    }

    private clamp(value: number): number {
        if (!Number.isFinite(value)) {
            return 0;
        }
        return Math.min(1, Math.max(0, value));
    }
}
