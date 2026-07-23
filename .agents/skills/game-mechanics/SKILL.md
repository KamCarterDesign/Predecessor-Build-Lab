---
name: game-mechanics
description: Comprehensive rules, formulas, and foundational mechanics for Predecessor, including combat math, armor penetration order, hero stat growth, objective timers, vision, and role definitions.
---

# Predecessor Game Mechanics Reference

This document serves as the authoritative domain reference for how Predecessor's underlying game systems, combat math, objective spawns, hero stat scaling, vision, and item mechanics operate.

---

## 1. Combat & Damage Math

### Armor Types
Predecessor divides armor into **Physical Armor** and **Magical Armor**, which respectively reduce **Physical Damage** and **Magical Damage**.

### Damage Received Formula
Raw damage dealt to a unit is mitigated by its **Effective Armor**:
$$\text{Damage Received} = (\text{Base Damage} \times \text{Scaling Ratio} \times \text{Crit Multiplier}) \times \left(\frac{100}{\text{Effective Armor} + 100}\right)$$

*Example*: Dealing 200 raw damage to a unit with 60 Effective Armor results in $200 \times (100 / 160) = 125$ damage taken.

### Damage Resistance Percentage
$$\text{Armor Resistance \%} = 1 - \frac{100}{100 + \text{Effective Armor}}$$
* Each point of armor roughly equals **1% additional Effective Health (EHP)** against that damage type.
* Common Armor-to-Resistance Benchmarks:
  - 11 Armor $\approx$ 10% Resistance
  - 25 Armor $\approx$ 20% Resistance
  - 50 Armor $\approx$ 33% Resistance
  - 100 Armor $\approx$ 50% Resistance
  - 200 Armor $\approx$ 67% Resistance
  - 300 Armor $\approx$ 75% Resistance

### Effective Armor & Penetration Order of Operations
When evaluating target armor against attacker penetration, effects MUST be applied in strict priority order:

1. **Percent Armor Reduction** (e.g. debuffs that reduce total target armor by a %)
2. **Flat Armor Reduction** (e.g. debuffs that subtract a fixed armor value)
3. **Percent Penetration** (e.g. attacker's % armor pen)
4. **Flat Penetration** (e.g. attacker's flat armor pen)

$$\text{Effective Armor} = \left[(\text{Target Armor} \times (1 - \text{\% Armor Reduction}) - \text{Flat Armor Reduction}) \times (1 - \text{\% Penetration})\right] - \text{Flat Penetration}$$

*Example*: Target has 100 Armor. Attacker has 30% Penetration and 10 Flat Penetration.
$$\text{Effective Armor} = (100 \times 1.0 - 0) \times (1 - 0.30) - 10 = (100 \times 0.70) - 10 = 60$$

---

## 2. Hero Leveling & Stat Growth Scaling

### Hero Growth Formula (Levels 1–18)
Every hero possesses base stats and a **Stat Growth** modifier per level.
* **Level 1**: Base stat value.
* **Level 2**: Hero receives **80%** of the Stat Growth value.
* **Level 2–18 Scaling**: Growth modifier increases by **+2.5% per level** up to **120% at Level 18** (100% growth reached at Level 10).

$$\text{Stat Growth Multiplier for Level } N = 0.80 + 0.025 \times (N - 2) \quad (N \ge 2)$$

### Ability Points & Progression
* Max Hero Level: **18**.
* Abilities: 1 Passive, 1 Basic Attack, 3 Normal Abilities (max 5 ranks each), 1 Ultimate (max 3 ranks).
* Ultimate ranks available strictly at levels **6**, **11**, and **16**.

---

## 3. Defense, Crowd Control & Healing Math

### Tenacity & Crowd Control (CC)
* Reduces duration of stuns, slows, silences, and roots by a percentage equal to Tenacity.
* **Hard Duration Cap**: Tenacity cannot reduce CC duration by more than **60%** (Max 60% Tenacity).
* **Negative Tenacity**: Tenacity CAN fall below 0% (e.g. Flux Matrix's *Unstable Shackles* reduces nearby enemy Tenacity by 20%). A unit at 0% reduced to -20% suffers 20% longer CC duration.
* **Immunity / Exclusions**: Tenacity **has no effect on Knock-ups or Suppressions**.

### Damage Mitigation
* Percentage reduction applied to all incoming damage **before** Armor is calculated.
* Reduces Physical, Magical, and True Damage? *Mitigation affects all damage types EXCEPT True Damage and Executes.*

### Heal & Shield Power (HSP)
* Enhances outbound Healing and Shielding applied to self or allies.
* Does **NOT** affect natural Health Regen.
$$\text{Output Value} = \left[(\text{Magical Power} \times \text{Scaling \%}) + \text{Base Value}\right] \times (1 + \text{HSP \%})$$

---

## 4. Map Objectives & Spawn Cycles

### River Buffs (Midlane Side)
* **Initial Spawn**: 3:00 minutes.
* **Respawn Interval**: Every 2 minutes (5:00, 7:00, 9:00, etc.).
* **Types**: Orange (Attack Speed), Pink (Ability Power), Grey (Movement Speed), Green (Shield). All grant 250 Mana over 5s.
* **Evolved River Buffs (21:00+ Minutes)**:
  - Orange: Attack Speed + 5% Omnivamp
  - Pink: Ability Power + Ability Haste
  - Grey: Movement Speed + Out-of-Combat MS
  - Green: Max HP Shield (explodes in AoE damage when broken)

### Jungle Camps & Aggro
* Camps: 2-Camp, 3-Camp, 4-Camp, 5-Camp, Red Buff (Burn/Slow on autos), Blue Buff (Mana Regen + Ability Haste).
* Aggro leash distance defined by blue ground circle; leaving leash resets camp HP.
* **Hunt Item**: Deals 500 damage to jungle monsters. Upgrades to **Wild Hunt** (1000 damage) after 40 monster kills.

### Fangtooth & Orb Prime
* **Fangtooth (Duo Lane Side)**:
  - Kill 1: +50% Buff Duration (up to +30s)
  - Kill 2: +8% Out-of-Combat Movement Speed
  - Kill 3: +8% Physical/Magical Power & Armor
  - Subsequent spawns $\rightarrow$ **Primal Fangtooth**: Grants True Damage burn on hit.
* **Orb Prime (Offlane Side)**:
  - **Mini Prime (<20 min)**: Grants single slayer bonus power, armor, and minion empowerment aura.
  - **Orb Prime (20+ min)**: Grants team-wide bonus power, fast out-of-combat HP/Mana regen, and minion empowerment aura.

---

## 5. Roles & Vision System

### 5 Roles
1. **Offlane**: Solo tank/bruiser, exp priority.
2. **Jungle**: Roamer, camp farming, ganking with Hunt item.
3. **Midlane**: High burst / AoE mages, river buff control.
4. **Support**: Enchanters/tanks, utility, ward vision (Solstone crest), no last hits.
5. **Carry**: Ranged physical scaling DPS, gold priority.

### Vision & Stealth Rules
* **Line of Sight**: Fog walls block vision into/out of jungle.
* **Stealth Wards**: Invisible to enemies, reveal non-stealthed units in area.
* **Sentry**: Sweep aura revealing enemy wards (takes 3 basic attacks to destroy).
* **Solstone Ward**: Tier 3 Support crest ward; combines stealth ward vision with sentry ward detection.
* **Stealth Reveal Conditions**: Revealed by enemy structures, Sentry/Solstone, or close proximity to enemy heroes.

### Advanced Movement
* Attacking applies a movement slow (Melee slow is lighter than Ranged; Melee miss slow is reduced).
* **No Backpedal Penalty**: Moving backward while facing an enemy incurs 0% movement speed penalty.
* **Bloom Plants**: Detonated via basic attack to knock units up/away.
