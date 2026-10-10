# Slot Game Implementation

## Overview
This is a 5-reel slot. Each reel shows 3 symbols. Symbol ids and weights come from `assets/resources/symbols/SymbolConfig.json`. Base-game strips only use ids 0–11.

## Architecture
The game follows an MVC (Model-View-Controller) pattern with the following components:

### Core Components
- **ReelController**: Manages each reel's spinning logic and coordinates between model, view, and service
- **ReelView**: Handles the visual representation of spinning symbols
- **ReelModel**: Stores the current symbol state for each reel
- **ReelSpinService**: Manages spin timing and delays

### Configuration
- **REEL_CONFIG**: Loaded from `assets/resources/reel/ReelConfig.json` (5 reels, 3 visible rows, spin and stop timing)
- **SYMBOL_CONFIG**: Loaded from `assets/resources/symbols/SymbolConfig.json`

## Symbols

Ids match `SymbolConfig.json`. Base-game strips in `assets/resources/reel/ReelStrips.json` use ids 0–11. Ids 12–25 appear only in features.

### Base reels (ids 0–11)

| Id | Name | Frame |
| --- | --- | --- |
| 0 | ace | A |
| 1 | king | K |
| 2 | queen | Q |
| 3 | jack | J |
| 4 | ten | 10 |
| 5 | chest | CHEST |
| 6 | wheel | WHEEL |
| 7 | pirate | PIRATE |
| 8 | kraken | KRAKEN |
| 9 | scatter | SCATTER |
| 10 | wild | WILD |
| 11 | bonus | BONUS |

### Feature-only (not on the base strips)

| Id | Name | Frame |
| --- | --- | --- |
| 12 | jackpot mini | MINI |
| 13 | jackpot maxi | MAXI |
| 14 | jackpot mega | MEGA |
| 15 | jackpot grand | GRAND |
| 16 | jackpot pearl | PEARL |
| 17 | add spin | ADDSPIN |
| 18 | reward R1 | R1 |
| 19 | reward R2 | R2 |
| 20 | reward R3 | R3 |
| 21 | reward R4 | R4 |
| 22 | multiplier x2 | X2 |
| 23 | multiplier x3 | X3 |
| 24 | multiplier x4 | X4 |
| 25 | multiplier x5 | X5 |

ADDSPIN (17) is a free-spin overlay. `COMPASS.png` is in the symbols atlas and has no id, so it is not a playable symbol.

## Stop positions

Demo stop positions are `demoStopIndices` in `assets/resources/reel/ReelStrips.json`. Each value is the strip index where that reel stops (center visible row).

## Files Structure
```
assets/game/
├── bootstrap/
│   └── GameBootstrap.ts          # Main game controller
├── reels/
│   ├── config/
│   │   └── ReelConfig.ts         # Reel configuration
│   ├── controller/
│   │   └── ReelController.ts     # Reel controller
│   ├── model/
│   │   └── ReelModel.ts          # Reel data model
│   ├── view/
│   │   └── ReelView.ts           # Reel visual component
│   └── services/
│       └── ReelSpinService.ts    # Spin timing service
└── symbols/
    └── config/
        └── SymbolConfig.ts       # Symbol definitions
```
