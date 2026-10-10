# Kraken Treasure

Pirate-themed 5×3 slot game built with **Cocos Creator 3.7.3** and TypeScript. The playfield is designed at **1560×720**. Gameplay numbers live in JSON under `assets/resources`. The composition root is [`assets/game/bootstrap/GameBootstrap.ts`](assets/game/bootstrap/GameBootstrap.ts), which wires services, views, the spin state machine, and the reel controllers.

## Features

- **Base game.** 5 reels, 3 visible rows, and 15 paylines.
- **Symbols.** Ids match `assets/resources/symbols/SymbolConfig.json`. Base reels (ids 0–11) are A, K, Q, J, 10, chest, wheel, pirate, kraken, scatter, wild, and bonus. Feature-only symbols (ids 12–25, not on the base strips) are jackpot Mini, Maxi, Mega, Grand, and Pearl, the ADDSPIN overlay, rewards R1–R4, and multipliers X2–X5.
- **Jackpot.** A progressive meter feeds a feature of up to 10 pearl spins. The feature stops early at 6 pearls, then a final reel awards Mini, Maxi, Mega, or Grand.
- **Kraken progress.** Collect 10 kraken symbols for a 25× award.
- **Treasure hunt.** Collect 10 chest symbols, then pick one of three rewards (coins or free spins).
- **Free spins.** An ADDSPIN overlay can land during free spins and award extra spins.
- **Auto spin.** Choose a spin count and an optional loss limit.
- **Daily rewards.** A 7-day claim cycle stored locally.
- **Presentation.** Win-line display, audio, particles, game-speed settings, and help, paytable, and rules panels.
- **Demo play.** A local wallet starts at 10,000 coins. A test-mode panel and debug keyboard shortcuts can force outcomes when debug mode is enabled on `GameBootstrap`.

## Requirements

- [Cocos Creator 3.7.3](https://www.cocos.com/en/creator)

This project has no npm start script. Preview it from the Creator editor.

## Getting started

1. Install Cocos Creator 3.7.3.
2. Open this folder as a project (`package.json` records the Creator version).
3. Open a scene:
   - [`assets/scenes/lobby.scene`](assets/scenes/lobby.scene)
   - [`assets/scenes/game.scene`](assets/scenes/game.scene)
4. Press **Preview** in the editor.

`GameBootstrap` sits on a node in the game scene. Feature views (reels, jackpot, progress meters, HUD, audio, and popups) are assigned on that component in the inspector.

## Spin flow

Spins run through the state machine in [`assets/game/states/SlotGameStateRegistry.ts`](assets/game/states/SlotGameStateRegistry.ts):

`Ready` → `Spinning` → `Stop` → `Evaluate` → `Result` → `Presentation`

`FreeSpin`, `Feature`, and `AutoSpin` take over when those modes are active.

## Project layout

```
assets/
  core/                 Shared slot framework
    reel/               Reel model, view, and controller bases
    slot/               Session, spin result, and reel-set bases
    stateMachine/       Generic state machine
    events/             Event bus
    betting/            Wallet and bet interfaces
  game/                 Kraken Treasure features
    bootstrap/          Composition root (GameBootstrap)
    reels/              Base-game reels
    symbols/            Symbol definitions
    paylines/           Win-line rendering
    jackpot/            Progressive jackpot feature
    kraken/             Kraken collection meter
    treasurehunt/       Treasure hunt popup
    freeSpin/           Free-spin and ADDSPIN flow
    autoSpin/           Auto-spin panel
    dailyRewards/       Daily reward calendar
    states/             Spin state machine
    services/           Win presentation and feature coordination
    gamerules/          Help, paytable, rules, and test mode
    ui/                 HUD, spin controls, and meters
    audio/              Audio manager and cues
    particles/          Particle effects
    math/               Theoretical RTP sampling
    debug/              Forced-outcome shortcuts
  resources/            JSON configs and runtime assets
  scenes/               lobby.scene and game.scene
settings/               Creator project settings
```

`assets/core` is the reusable slot layer. `assets/game` is this title: each feature folder keeps its own config, model, view, and controller.

## Configuration

Tune the game by editing the JSON files under `assets/resources`. Matching TypeScript modules load them at runtime.

| File | What it controls |
| --- | --- |
| `assets/resources/reel/ReelConfig.json` | Reel count, visible rows, spin and stop timing |
| `assets/resources/reel/ReelStrips.json` | Symbol strips and demo stop indices |
| `assets/resources/symbols/SymbolConfig.json` | Symbol ids, names, weights, and atlas frames |
| `assets/resources/paytable/PaylinesConfig.json` | The 15 payline row patterns |
| `assets/resources/paytable/PaytableConfig.json` | Symbol payouts |
| `assets/resources/betting/BetConfig.json` | Starting coins, bet levels, and multipliers |
| `assets/resources/jackpot/JackpotConfig.json` | Jackpot contribution, seed, and trigger |
| `assets/resources/jackpot/JackpotReelConfig.json` | Jackpot feature reel timing |
| `assets/resources/kraken/KrakenProgressConfig.json` | Kraken collect count and award |
| `assets/resources/treasurehunt/TreasureHuntProgressConfig.json` | Chest collect count and reward choices |
| `assets/resources/freeSpin/AddSpinConfig.json` | ADDSPIN chance and extra spins awarded |
| `assets/resources/autoSpin/AutoSpinConfig.json` | Auto-spin counts and loss limits |
| `assets/resources/dailyRewards/DailyRewardsConfig.json` | 7-day reward amounts |
| `assets/resources/math/MathProfileConfig.json` | Outcome profile and target RTP |

## Debug shortcuts

Turn on **Debug Mode Enabled** on `GameBootstrap` in the inspector. With that flag set, these keys force a result:

| Key | Result |
| --- | --- |
| `1` | Line win |
| `2` | Wild win |
| `3` | Bonus win |
| `4` | Free spins |
| `5` | Jackpot feature |
| `6` | Jackpot feature that lands six pearls |
| `7` | Bar-filled particle |

The in-game test-mode panel triggers the same line, wild, bonus, scatter, and jackpot outcomes.

## What to commit

Keep `assets/`, `settings/`, `package.json`, and `tsconfig.json`. Cocos Creator regenerates `library/`, `temp/`, and build output locally, so those folders are generated files rather than source.
