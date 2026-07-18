/**
 * Utility to parse Predecessor data description strings containing custom HTML tags
 * and replace them with standard HTML spans and emoji stat icons/signs.
 */
export function parseDescription(text: string): string {
  if (!text) return '';
  let parsed = text;

  // 1. Replace <img> tags with corresponding emojis/signs
  const imgReplacements: Record<string, string> = {
    ADIconOrange: '🗡️',
    HealthIconGreen: '❤️',
    ArmorOrange: '🛡️',
    MRIcon: '🔮',
    APIconBlue: '⚡',
    AbilityHaste: '⌛',
    CritIconGold: '💥',
    PhysPen: '⚔️',
    ManaBlue: '💧',
    ASIconOrange: '🏹',
    AttackSpeedIcon: '🏹',
    BonusDamage: '✨',
  };

  // Replace both self-closing and full img tag patterns for each id
  for (const [id, symbol] of Object.entries(imgReplacements)) {
    const regexFull = new RegExp(`<img[^>]*id="${id}"[^>]*>[\\s\\S]*?<\\/img>`, 'gi');
    const regexSelf = new RegExp(`<img[^>]*id="${id}"[^>]*\\/?>`, 'gi');
    parsed = parsed.replace(regexFull, symbol).replace(regexSelf, symbol);
  }

  // 2. Map custom style tags to HTML spans with inline styling matching pred.gg theme
  const tagMappings: Record<string, string> = {
    Header: 'font-weight: bold; color: #ffffff; font-size: 1rem; display: block; margin-top: 4px;',
    AttackDamageText: 'color: #f97316; font-weight: bold;',
    EffectText: 'color: #38bdf8; font-weight: bold;',
    Effecttext: 'color: #38bdf8; font-weight: bold;',
    TrueDamageText: 'color: #f3f4f6; font-weight: bold;',
    CC_Text: 'color: #c084fc; font-weight: bold;',
    HealthText: 'color: #22c55e; font-weight: bold;',
    HEalthText: 'color: #22c55e; font-weight: bold;',
    ArmorText: 'color: #f59e0b; font-weight: bold;',
    MRText: 'color: #a855f7; font-weight: bold;',
    AbilityPowerText: 'color: #60a5fa; font-weight: bold;',
    AbilityPowertext: 'color: #60a5fa; font-weight: bold;',
    RageText: 'color: #ef4444; font-weight: bold;',
    AbilityName: 'color: #93c5fd; font-weight: 500; text-decoration: underline;',
    ManaText: 'color: #3b82f6; font-weight: bold;',
    CritChanceText: 'color: #f43f5e; font-weight: bold;',
    PenDamageText: 'color: #fb923c; font-weight: bold;',
    GoldText: 'color: #fbbf24; font-weight: bold;',
    AnomalyText: 'color: #fda4af; font-weight: bold;',
    ShieldText: 'color: #38bdf8; font-weight: bold;',
    AttackSpeedText: 'color: #fbbf24; font-weight: bold;',
    Condition: 'color: #94a3b8; font-style: italic;',
    PassiveItemText: 'color: #cbd5e1; font-weight: 500;',
  };

  for (const [tag, style] of Object.entries(tagMappings)) {
    const openRegex = new RegExp(`<${tag}>`, 'g');
    const closeRegex = new RegExp(`</${tag}>`, 'g');
    parsed = parsed.replace(openRegex, `<span style="${style}">`).replace(closeRegex, '</span>');
  }

  return parsed;
}
