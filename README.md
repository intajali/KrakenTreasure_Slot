# Slot Game Implementation

## Overview
This is a slot game implementation with 5 reels, spinning symbols, and delayed stopping with specific symbol indices.

## Architecture
The game follows an MVC (Model-View-Controller) pattern with the following components:

### Core Components
- **ReelController**: Manages each reel's spinning logic and coordinates between model, view, and service
- **ReelView**: Handles the visual representation of spinning symbols
- **ReelModel**: Stores the current symbol state for each reel
- **ReelSpinService**: Manages spin timing and delays

### Configuration
- **REEL_CONFIG**: Defines 5 reels with 3 symbols each, 2 second spin duration, and 500ms stop delay
- **SYMBOL_CONFIG**: Defines 8 symbols with different weights (cherry, lemon, orange, grape, bell, diamond, seven, star)

## Usage

### Setup
1. Attach the `GameBootstrap` component to a node in your scene
2. Assign a `reelsContainer` node in the inspector
3. The game will automatically create 5 reels and start spinning on game start

### How It Works
1. **Start**: All 5 reels begin spinning simultaneously after 1 second delay
2. **Spin**: Symbols randomly change every 100ms during spin
3. **Stop**: Reels stop sequentially with 1 second delay between each:
   - Reel 0 stops at symbols [2, 3, 4] (🍇, 🔔, 💎)
   - Reel 1 stops at symbols [5, 1, 6] (💎, 🍋, 7️⃣)
   - Reel 2 stops at symbols [0, 7, 2] (🍒, ⭐, 🍇)
   - Reel 3 stops at symbols [3, 4, 1] (🍇, 🔔, 🍋)
   - Reel 4 stops at symbols [6, 0, 5] (7️⃣, 🍒, 💎)

### Customization
To customize the stop results, modify the `stopIndices` array in `GameBootstrap.ts`:

```typescript
const stopIndices = [
    [2, 3, 4],  // Reel 0: symbol indices for each of the 3 symbol positions
    [5, 1, 6],  // Reel 1
    [0, 7, 2],  // Reel 2
    [3, 4, 1],  // Reel 3
    [6, 0, 5]   // Reel 4
];
```

Symbol indices correspond to:
- 0: 🍒 (cherry)
- 1: 🍋 (lemon)
- 2: 🍊 (orange)
- 3: 🍇 (grape)
- 4: 🔔 (bell)
- 5: 💎 (diamond)
- 6: 7️⃣ (seven)
- 7: ⭐ (star)

### Respin
Call `resetAndSpin()` on the GameBootstrap component to reset and spin again:

```typescript
const gameBootstrap = this.node.getComponent(GameBootstrap);
gameBootstrap.resetAndSpin();
```

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
