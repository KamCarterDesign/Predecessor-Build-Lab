/**
 * Utility to parse Predecessor data description strings containing custom HTML tags
 * and replace them with standard HTML spans and emoji stat icons/signs.
 */
export function getStatIconHtml(id: string, size: number = 14): string {
  const mapping: Record<string, { color: string, svg: string }> = {
    ADIconOrange: { color: '#f97316', svg: '<path d="M18 3h3v3L9 18l-3-3L18 3z M6 18l-3 3 M4 17l3 3" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }, // Sword
    HealthIconGreen: { color: '#22c55e', svg: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor"/>' }, // Heart
    ArmorOrange: { color: '#f59e0b', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }, // Shield
    MRIcon: { color: '#a855f7', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M12 8v8 M8 12h8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }, // Magic Shield
    APIconBlue: { color: '#60a5fa', svg: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/>' }, // Lightning
    AbilityHaste: { color: '#eab308', svg: '<path d="M5 2h14 M5 22h14 M19 2l-7 8-7-8 M5 22l7-8 7 8" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }, // Hourglass
    CritIconGold: { color: '#f43f5e', svg: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 2v4 M12 18v4 M2 12h4 M18 12h4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' }, // Target
    PhysPen: { color: '#fb923c', svg: '<path d="m14.5 17.5-2.5 2.5-4-4 2.5-2.5 M5 19 19 5 M19 5h-4 M19 5v4" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }, // Dagger
    ManaBlue: { color: '#3b82f6', svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="currentColor"/>' }, // Potion / Droplet
    ASIconOrange: { color: '#fbbf24', svg: '<path d="M17 11l-5-5-5 5 M17 18l-5-5-5 5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }, // Chevrons
    AttackSpeedIcon: { color: '#fbbf24', svg: '<path d="M17 11l-5-5-5 5 M17 18l-5-5-5 5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' },
    BonusDamage: { color: '#facc15', svg: '<path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275z" fill="currentColor"/>' },
    Lifesteal: { color: '#ef4444', svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="currentColor"/>' }, // Red droplet
    MagicalLifesteal: { color: '#d946ef', svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="currentColor"/><path d="M12 7l-2 5.5h3l-2 5.5 5-7h-3.5z" fill="#ffffff"/>' }, // Purple droplet with lightning
    Omnivamp: { color: '#f43f5e', svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="currentColor"/><path d="M4 14c2.5-3 5.5-3 8 0 M20 14c-2.5-3-5.5-3-8 0" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none"/>' }, // Winged droplet
    MagPen: { color: '#a78bfa', svg: '<path d="M12 2l2.4 5 5.6.8-4 4 1 5.7-5-2.6-5 2.6 1-5.7-4-4 5.6-.8z M5 19l14-14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' }, // Magic Wand / Spark Pen
    HealShield: { color: '#38bdf8', svg: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' }, // Shield Cross
    HealthRegen: { color: '#4ade80', svg: '<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v6M9 11h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' }, // Heart Pulse
    ManaRegen: { color: '#60a5fa', svg: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v6M9 11h6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' }, // Droplet Pulse
    MovementSpeed: { color: '#facc15', svg: '<path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" fill="currentColor"/>' }, // Lightning Arrow
    Tenacity: { color: '#c084fc', svg: '<path d="M12 2v20M5 12h14M5 6l14 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>' }, // Cross Anchor
    GoldPerSecond: { color: '#fbbf24', svg: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M12 7v10M9 9.5h6 M9 14.5h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' }, // Coin
  };

  const item = mapping[id];
  if (!item) return '✨';

  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="display:inline-block; vertical-align:middle; margin-top:-2px; margin-right:4px; color:${item.color};">${item.svg}</svg>`;
}

export function parseDescription(text: string): string {
  if (!text) return '';
  let parsed = text;

  // 0. If the description contains unresolved template placeholders ({Variable}),
  // discard the templated lines (which produce broken text like "Slow%", "Close Bonusx", "Armor Shred Durations")
  // and preserve only the clean <Header> block if one exists.
  if (parsed.includes('{')) {
    const headerMatch = parsed.match(/<Header>([\s\S]*?)<\/Header>/i);
    if (headerMatch) {
      parsed = headerMatch[0];
    } else {
      parsed = parsed
        .split(/<br\s*\/?>|\n/gi)
        .filter(line => !line.includes('{') && !line.includes('}'))
        .join('<br>');
    }
  }

  // 1. Replace <img> tags with corresponding SVGs
  const imgKeys = [
    'ADIconOrange',
    'HealthIconGreen',
    'ArmorOrange',
    'MRIcon',
    'APIconBlue',
    'AbilityHaste',
    'CritIconGold',
    'PhysPen',
    'ManaBlue',
    'ASIconOrange',
    'AttackSpeedIcon',
    'BonusDamage',
  ];

  // Replace both self-closing and full img tag patterns for each id
  for (const id of imgKeys) {
    const symbol = getStatIconHtml(id, 14);
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

  // 3. Clean up raw template placeholder tags like {MovementSpeed} or {Duration}
  parsed = parsed.replace(/\{([A-Za-z0-9_]+)\}/g, (match, p1) => {
    const spaced = p1
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
    return `<span style="color: #60a5fa; font-weight: 600;">${spaced}</span>`;
  });

  return parsed;
}
