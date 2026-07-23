/**
 * Hero Augments Sync Script
 *
 * Parses hero augments from Augment List.txt and matching icons from Augment Icons folder.
 * Copies icons locally to public/assets/augments/ and updates Firestore hero docs.
 *
 * Run: npm run sync:augments
 */
import fs from 'fs';
import path from 'path';
import { getFirestore } from './firebase-admin.js';

const assetsDir = path.resolve(process.cwd(), 'Knowledge Assets');
const augmentListPath = path.join(assetsDir, 'Augment List.txt');
const iconsDir = path.join(assetsDir, 'Augment Icons');
const destIconsDir = path.resolve(process.cwd(), 'public', 'assets', 'augments');

// Manual mappings for mismatching icon names
const manualMappings: Record<string, string> = {
  'argus_infinite obliteration': 'Argus_SynapticShock.png',
  'dekker_ionic surge': 'Dekker_IonicSurge.png',
  'dekker_photon efficiency': 'Dekker_MomentumBoost.png',
  'grux_red mist': 'Grux_WarlordsMight.png',
  'narbash_war anthem': 'Narbash_BerserkerBeat.png',
  'narbash_thonk': 'Narbash_RhythmicRecharge.png',
  "riktor_warden's leash": 'Riktor_BrutalChains.png',
  "riktor_zap o' 9-chains": 'Riktor_CurrentOverload.png',
  'shinbi_allegro': 'Shinbi_BitesPerMinute.png',
  'shinbi_encore': 'Shinbi_Showstopper.png',
  'sparrow_endless hunt': 'Sparrow_VeiledStalker.png',
  'aurora_glacial thorns': 'Aurora_DeepFreeze.png',
  'skylar_assault mk-ii': 'Skylar_SuppressiveFire.png',
  'steel_heavy metal': 'Steel_Bulldozer.png',
  'twinblast_spray \'n pray': 'TwinBlast_HotShot.png',
  'countess_shadow echo': 'Countess_ShadowStrike.png',
  'gadget_eureka!': 'Gadget_IonBarrier.png',
  'khaimera_lane lurker': 'Khaimera_MinionRegeneration.png',
  "kira_dusk's embrace": 'Kira_DusksEmbrace.png',
  'mourn_nightstalker': 'Mourn_ContagionedEclipse.png',
  'muriel_sacrosanct': 'Muriel_AerialAssistance.png',
  'rampage_tiny titan': 'Rampage_TintyTitan.png',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function syncAugments() {
  console.log('🦸 Starting hero augments sync...\n');

  if (!fs.existsSync(destIconsDir)) {
    fs.mkdirSync(destIconsDir, { recursive: true });
    console.log(`Created directory: ${destIconsDir}`);
  }

  const content = fs.readFileSync(augmentListPath, 'utf-8');
  const sections = content.split(/\r?\n-\r?\n/);
  const iconFiles = fs.readdirSync(iconsDir);

  const db = getFirestore();
  const snap = await db.collection('heroes').get();
  const dbHeroes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const dbHeroMap = new Map<string, any>();
  dbHeroes.forEach(h => {
    dbHeroMap.set(normalize(h.display_name), h);
  });

  const batch = db.batch();
  let updatedCount = 0;

  for (const sec of sections) {
    const lines = sec.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const rawHeroName = lines[0];
    const rest = lines.slice(1);

    const dbHero = dbHeroMap.get(normalize(rawHeroName));
    if (!dbHero) {
      console.warn(`⚠ Hero NOT found in Firestore: ${rawHeroName}`);
      continue;
    }

    const heroSlug = dbHero.slug;
    const normalizedHero = dbHero.display_name.toLowerCase().replace(/[\s\._&']+/g, '');
    const heroIcons = iconFiles.filter(f => {
      const normFile = f.toLowerCase().replace(/[\s\._&']+/g, '');
      return normFile.startsWith(normalizedHero);
    });

    let parsedAugments: Array<{ title: string; description: string }> = [];

    // Parse augments
    if (heroSlug === 'dekker') {
      parsedAugments = [
        { title: 'Ionic Surge', description: rest[0] },
        { title: rest[1], description: rest[2] },
        { title: rest[3], description: rest[4] }
      ];
    } else if (heroSlug === 'eden') {
      parsedAugments = [
        { title: 'Kinetic Waltz', description: rest[0] },
        { title: rest[1], description: rest[2] },
        { title: rest[3], description: rest[4] }
      ];
    } else if (heroSlug === 'zarus') {
      parsedAugments = [
        { title: rest[0], description: rest[1] },
        { title: rest[2], description: rest[3] },
        { title: 'Flow State', description: rest[4] }
      ];
    } else {
      let i = 0;
      while (i < rest.length && parsedAugments.length < 3) {
        const title = rest[i];
        i++;
        let description = '';
        while (i < rest.length) {
          const nextLine = rest[i];
          if (nextLine.length < 40 && !nextLine.endsWith('.') && !nextLine.includes(' deals ') && !nextLine.includes(' has ') && !nextLine.includes(' grants ') && description.length > 0) {
            break;
          }
          description += (description ? ' ' : '') + nextLine;
          i++;
        }
        parsedAugments.push({ title, description });
      }
    }

    const finalAugments = [];

    for (const aug of parsedAugments) {
      let matchedIconFile = '';
      const manualKey = `${heroSlug.replace(/[^a-z0-9]/g, '')}_${aug.title.toLowerCase()}`;

      if (manualMappings[manualKey]) {
        matchedIconFile = manualMappings[manualKey];
      } else {
        const normTitle = normalize(aug.title);
        matchedIconFile = heroIcons.find(icon => {
          const normIcon = normalize(icon.replace(dbHero.display_name, '').replace(dbHero.name, ''));
          return normIcon.includes(normTitle) || normTitle.includes(normIcon);
        }) || '';
      }

      let imageUrl = '';
      if (matchedIconFile) {
        // Copy icon to public/assets/augments/
        const ext = path.extname(matchedIconFile);
        const destFilename = `${heroSlug}-${slugify(aug.title)}${ext}`;
        const srcPath = path.join(iconsDir, matchedIconFile);
        const destPath = path.join(destIconsDir, destFilename);

        fs.copyFileSync(srcPath, destPath);
        imageUrl = `/assets/augments/${destFilename}`;
      } else {
        // Fallback Strategy:
        // 1. Try to find a matching ability in the hero's document
        const descLower = aug.description.toLowerCase();
        const titleLower = aug.title.toLowerCase();
        
        const matchedAbility = dbHero.abilities?.find((ab: any) => {
          const abName = ab.display_name.toLowerCase();
          return (descLower.includes(abName) || titleLower.includes(abName)) && ab.image_url;
        });

        if (matchedAbility) {
          imageUrl = matchedAbility.image_url;
          console.log(`  ↪ Fallback (Ability: ${matchedAbility.display_name}) for ${dbHero.display_name} - ${aug.title}`);
        } else {
          // 2. Fallback to Hero Portrait
          imageUrl = dbHero.image_url;
          console.log(`  ↪ Fallback (Portrait) for ${dbHero.display_name} - ${aug.title}`);
        }
      }

      finalAugments.push({
        title: aug.title,
        description: aug.description,
        image_url: imageUrl
      });
    }

    // Save to Firestore
    const docRef = db.collection('heroes').doc(dbHero.slug);
    batch.update(docRef, { augments: finalAugments });
    updatedCount++;
    console.log(`✓ Processed: ${dbHero.display_name}`);
  }

  console.log('\n💾 Committing updates to Firestore...');
  await batch.commit();
  console.log(`✅ Success! Synced augments for ${updatedCount} heroes.`);
}

syncAugments().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
