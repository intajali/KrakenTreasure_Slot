import { sys } from 'cc';
import { GAME_SPEED_CONFIG } from './GameSpeedConfig';

export class GameSpeedStorage {
    public load(): number | null {
        try {
            const raw = sys.localStorage.getItem(GAME_SPEED_CONFIG.storageKey);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw) as { speed?: number };
            if (typeof parsed.speed === 'number') {
                return parsed.speed;
            }
            return null;
        } catch {
            return null;
        }
    }

    public save(speed: number): void {
        try {
            sys.localStorage.setItem(GAME_SPEED_CONFIG.storageKey, JSON.stringify({ speed }));
        } catch {
            // Ignore persistence failures in restricted environments.
        }
    }
}
