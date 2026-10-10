# RTP Calculation

This document describes how Return To Player (RTP) is calculated and applied in Krakens Treasure.

## Industry definitions used

### 1. Theoretical RTP

Expected long-run return of the published math model:

```text
theoreticalRtp = E[totalWin] / stake
```

This is the value used to configure the game toward a target such as `0.96` (96%).

### 2. Observed RTP

Actual session accounting identity:

```text
observedRtp = totalPaid / totalWagered
```

Where:

- `totalWagered` = sum of all player stake amounts that were charged
- `totalPaid` = sum of all wins credited to the player (including bonus, scatter, and free-spin wins)

Observed RTP is for monitoring/reporting only. It does **not** steer spin outcomes.

---

## Configuration

File: `assets/resources/math/MathProfileConfig.json`

Relevant fields on the active profile:

| Field | Meaning |
| --- | --- |
| `targetRtp` | Desired theoretical RTP, e.g. `0.96` |
| `theoreticalSampleSpins` | Monte Carlo sample size used to estimate base theoretical RTP |
| hit acceptance rates | Volatility / hit-frequency tuning only (not RTP chasing) |

Example:

```json
{
  "targetRtp": 0.96,
  "theoreticalSampleSpins": 50000
}
```

---

## Theoretical RTP flow

Implemented in `assets/game/math/TheoreticalRtpCalculator.ts`.

### Step A — Estimate base theoretical RTP

1. Use unit stake `1`.
2. Sample random stop indices uniformly across each reel strip.
3. Build the centered visible window (`visibleRows = 3`, middle stop index).
4. Evaluate base-game return with raw paytable multipliers (`payoutScale = 1`):
   - best paying candidate per payline (with wild substitution)
   - bonus symbol award
   - scatter/feature award on the triggering spin
5. Average over `theoreticalSampleSpins`:

```text
theoreticalBaseRtp = sum(unitReturns) / sampleSpins
```

### Step B — Convert target RTP into a fixed payout scale

```text
payoutScale = (PaytableConfig.payoutScale ?? 1) * (targetRtp / theoreticalBaseRtp)
```

This scale is cached once at startup (`GameBootstrap.start()` warms it).

### Step C — Apply scale to all live payouts

Used by:

- `calculateSymbolPayout`
- `calculateBonusPayout`
- `calculateScatterPayout`

in `assets/game/paylines/config/PaytableConfig.ts`:

```text
payout = floor(paytableMultiplier * payoutScale * betAmount * multiplier)
```

So the math model itself is scaled to the configured theoretical target. Outcomes are still random; RTP is not forced spin-by-spin.

---

## Observed RTP flow

Implemented in `assets/game/math/RtpTracker.ts`.

### Recording

| Event | Code path | Tracker update |
| --- | --- | --- |
| Spin stake charged | `GameBootstrap.tryDebitSpinCost()` | `recordWager(lastSpinCost)` |
| Win credited | `GameBootstrap.creditWin(amount)` | `recordPayout(amount)` |

Free spins / feature spins that are not charged do not increase `totalWagered`, but their wins still increase `totalPaid`. That matches common observed-RTP accounting.

### Formula

```text
if totalWagered <= 0:
  observedRtp = 0
else:
  observedRtp = totalPaid / totalWagered
```

Access via `SpinResultController.getRtpTracker().getSnapshot()`.

---

## What RTP does **not** do

Hit-frequency filtering in `MathOutcomeSelector` can still accept/reject candidates for volatility.

It does **not**:

- compare live observed RTP against target each spin
- reject wins because RTP is temporarily high
- force misses because RTP is temporarily low

That previous chase-style control was removed because it is not industry-standard theoretical RTP handling.

---

## End-to-end diagram

```text
MathProfileConfig.targetRtp (e.g. 0.96)
            |
            v
TheoreticalRtpCalculator
  - Monte Carlo base EV from strips + paytable
  - theoreticalBaseRtp = E[win]/stake
  - payoutScale = targetRtp / theoreticalBaseRtp
            |
            v
Paytable payout helpers (line/bonus/scatter)
            |
            v
KrakenWinEvaluator -> totalWin
            |
            +--> creditWin() -> RtpTracker.recordPayout()
            |
Player wager debit -> RtpTracker.recordWager()
            |
            v
observedRtp = totalPaid / totalWagered   (report only)
```

---

## Current limitations

1. Theoretical RTP estimation currently includes:
   - line wins
   - bonus awards
   - scatter/feature awards paid on the trigger spin
2. It does **not** fully expand free-spin cascade expected value after feature entry.
   Free-spin wins are included in **observed RTP**, but not yet fully modeled in theoretical EV.
3. Theoretical RTP is Monte Carlo estimated, not an exact full-cycle enumeration (`50^5` stop combinations).

---

## Key files

| File | Role |
| --- | --- |
| `assets/resources/math/MathProfileConfig.json` | Target RTP + volatility profile config |
| `assets/game/math/TheoreticalRtpCalculator.ts` | Theoretical RTP + payout scale |
| `assets/game/math/RtpTracker.ts` | Observed RTP accounting |
| `assets/game/math/MathOutcomeSelector.ts` | Hit-frequency/volatility filter |
| `assets/game/paylines/config/PaytableConfig.ts` | Applies RTP payout scale |
| `assets/game/services/SpinResultController.ts` | Math orchestration entry point |
| `assets/game/bootstrap/GameBootstrap.ts` | Records wager/payout; warms RTP scale |
