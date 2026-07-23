# Predecessor Game Mechanics Reference Guide

This document contains a synthesized guide to the core mechanics, math formulas, team objectives, vision system, and progression rules in **Predecessor**.

---

## Table of Contents
1. [Combat Math & Formulas](#1-combat-math--formulas)
2. [Hero Leveling & Growth Scaling](#2-hero-leveling--growth-scaling)
3. [Crowd Control & Defensive Stats](#3-crowd-control--defensive-stats)
4. [Items & Crest Progression](#4-items--crest-progression)
5. [Map Objectives & Buff Timers](#5-map-objectives--buff-timers)
6. [Roles, Vision & Movement](#6-roles-vision--movement)

---

## 1. Combat Math & Formulas

### Effective Armor & Damage Reduction
Predecessor uses two armor types: **Physical Armor** and **Magical Armor**.

#### Effective Armor Calculation
Penetration and armor reduction effects MUST be applied in the following exact order:
1. **Percent Armor Reduction**
2. **Flat Armor Reduction**
3. **Percent Penetration**
4. **Flat Penetration**

```
Effective Armor = ((Target Armor * (1 - % Armor Reduction)) - Flat Armor Reduction) * (1 - % Penetration) - Flat Penetration
```

*Example*: Against a 100 Armor target, an attacker with 30% Penetration and 10 Flat Penetration yields:
`Effective Armor = (100 * 0.70) - 10 = 60`

#### Damage Received Formula
```
Damage Received = Raw Damage * (100 / (Effective Armor + 100))
```
* **10 Armor** $\approx$ 10% Effective HP bonus vs damage type.
* **100 Armor** = 50% Damage Resistance.
* **200 Armor** = 67% Damage Resistance.
* **300 Armor** = 75% Damage Resistance.

---

## 2. Hero Leveling & Growth Scaling

### Stat Growth Formula (Level 1 to 18)
Hero stats increase at each level up to level 18.
* **Level 1**: Base stat value.
* **Level 2**: Hero gains **80%** of their Stat Growth rating.
* **Level 2–18 Scaling**: Stat growth increases linearly by **+2.5% per level** (Level 10 = 100%, Level 18 = 120%).

```
Total Stat at Level N = Base Stat + Stat Growth * [0.80 + 0.025 * (N - 2)] * (N - 1)
```

### Ability Progression
* **Levels 1–5**: Abilities scale up to 5 points.
* **Ultimate Skill**: Unlocked/upgraded strictly at Levels **6**, **11**, and **16**.

---

## 3. Crowd Control & Defensive Stats

### Tenacity
* Reduces duration of Stuns, Roots, Slows, and Silences.
* **Hard Cap**: Maximum **60%** CC duration reduction.
* **Negative Tenacity**: Can drop below 0% (e.g., Flux Matrix aura), increasing CC duration.
* **Exceptions**: Tenacity has **no effect** on **Knock-ups** or **Suppressions**.

### Heal & Shield Power (HSP)
Increases outgoing healing and shields applied to self or allies.
```
Final Heal/Shield = ((Magical Power * Scaling Ratio) + Base Amount) * (1 + HSP%)
```
*Note: HSP does not affect natural Health Regeneration (HPR).*

---

## 4. Items & Crest Progression

* **Item Inventory**: 1 Potion/Hunt slot, 1 Vision slot, 1 Crest slot, 6 Item slots.
* **Item Refund**: 70% of purchase price in fountain.
* **Passives**: Identical unique passives do **NOT** stack across items.
* **Crests (Starter Items)**:
  - Upgrade through minion/damage mini-quests (Tier I $\rightarrow$ Tier II $\rightarrow$ Tier III Active).
  - *Support Crest Warning*: Guardian & Consort crests grant bonus passive gold but reduce minion gold. Non-supports should never buy them!

---

## 5. Map Objectives & Buff Timers

### River Buffs
* **First Spawn**: 3:00 min.
* **Interval**: Every 2:00 min (5:00, 7:00, 9:00...).
* **Buff Types**:
  - **Orange**: Attack Speed (+ Omnivamp at 21m)
  - **Pink**: Ability Power (+ Ability Haste at 21m)
  - **Grey**: Movement Speed (+ Out-of-Combat MS at 21m)
  - **Green**: Max HP Shield (+ AoE Burst on break at 21m)
  - All restore **250 Mana** over 5 seconds.

### Major Objectives
* **Fangtooth (Duo Lane)**:
  - **Stack 1**: +50% Buff Duration (max +30s)
  - **Stack 2**: +8% Out-of-Combat MS
  - **Stack 3**: +8% Power & Armor
  - **Primal Fangtooth (Late Game)**: Grants True Damage burn on hit.
* **Orb Prime (Offlane)**:
  - **Mini Prime (<20m)**: Empowered minion aura + slayer stat buff.
  - **Orb Prime (20m+)**: Team-wide power, minion empowerment, fast out-of-combat HP/Mana regen.

---

## 6. Roles, Vision & Movement

### 5 Team Roles
* **Offlane**: Solo lane, level/experience lead focus.
* **Jungle**: Roaming monster farmer, ganks with Hunt (500 $\rightarrow$ 1000 wild hunt damage).
* **Midlane**: High AoE damage mages, river buff control.
* **Support**: Crowd control and vision control via Solstone crest.
* **Carry**: Ranged physical scaling hyper-carry.

### Vision & Invisibility
* **Fog Walls**: Entirely block line-of-sight between lanes and jungle.
* **Wards**: Stealth Ward (invisible), Sentry (reveals enemy wards), Solstone (Tier 3 Support ward combining vision + sentry detection).
* **Stealth Reveal**: Stealthed units revealed by enemy structures, Sentries, Solstone, or close enemy hero proximity.

### Movement
* **No Backpedal Penalty**: Moving backward while facing an opponent incurs **0% speed penalty**.
* **Auto Attack Penalty**: Basic attacks apply a temporary movement speed penalty (heavier on ranged heroes).
