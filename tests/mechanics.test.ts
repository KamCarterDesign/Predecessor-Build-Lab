import assert from 'assert';
import {
  calculateEffectiveArmor,
  calculateDamageReceived,
  calculateArmorResistancePct,
  calculateTenacityDuration,
  calculateHealShieldPower,
  calculateStatForLevel,
} from '../src/lib/mechanics/formulas';

console.log('Running Predecessor Game Mechanics Formula Tests...\n');

// 1. Effective Armor & Damage Received Test
// Example from Mechanics.txt: 100 Armor, 30% Penetration, 10 Flat Penetration => 60 Effective Armor
const effectiveArmor = calculateEffectiveArmor({
  targetArmor: 100,
  pctPenetration: 0.30,
  flatPenetration: 10,
});
assert.strictEqual(effectiveArmor, 60, `Expected 60 effective armor, got ${effectiveArmor}`);
console.log('✓ Effective Armor test passed (100 armor - 30% pen - 10 flat pen = 60)');

// Example from Mechanics.txt: 200 raw damage against 60 armor => 125 damage received
const damageReceived = calculateDamageReceived(200, effectiveArmor);
assert.strictEqual(damageReceived, 125, `Expected 125 damage received, got ${damageReceived}`);
console.log('✓ Damage Received test passed (200 raw dmg vs 60 armor = 125)');

// 2. Armor Resistance % Benchmarks
assert.strictEqual(Math.round(calculateArmorResistancePct(100) * 100), 50);
assert.strictEqual(Math.round(calculateArmorResistancePct(200) * 100), 67);
console.log('✓ Armor Resistance Benchmarks test passed (100 armor = 50%, 200 armor = 67%)');

// 3. Heal & Shield Power Test
// Example from Mechanics.txt: ((60% Magical Power x 120) + 200) x (1 + 10%) = 299 (rounded down)
const hspResult = calculateHealShieldPower(200, 120, 0.60, 0.10);
assert.strictEqual(hspResult, 299, `Expected 299 HSP output, got ${hspResult}`);
console.log('✓ Heal & Shield Power test passed (((60% * 120) + 200) * 1.10 = 299)');

// 4. Tenacity Cap & Negative Tenacity Test
const cappedTenacityDuration = calculateTenacityDuration(1.0, 0.80); // 80% tenacity capped at 60% => 0.4s
assert.strictEqual(cappedTenacityDuration, 0.4, `Expected 0.4s CC duration, got ${cappedTenacityDuration}`);

const negativeTenacityDuration = calculateTenacityDuration(1.0, -0.20); // -20% tenacity => 1.2s
assert.strictEqual(negativeTenacityDuration, 1.2, `Expected 1.2s CC duration, got ${negativeTenacityDuration}`);
console.log('✓ Tenacity Cap & Negative Tenacity tests passed (80% capped at 60% -> 0.4s, -20% -> 1.2s)');

// 5. Level Stat Growth Test
// Level 1 = 100 base
const lvl1Stat = calculateStatForLevel(100, 5, 1);
assert.strictEqual(lvl1Stat, 100);

// Level 2 = 100 + (5 * 0.80 * 1) = 104
const lvl2Stat = calculateStatForLevel(100, 5, 2);
assert.strictEqual(lvl2Stat, 104);

console.log('✓ Level Stat Growth test passed');

console.log('\nAll Predecessor Game Mechanics tests passed successfully!');
