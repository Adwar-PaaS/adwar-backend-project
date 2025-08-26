import { readdirSync } from 'fs';
import { join } from 'path';

async function main() {
  const seedsDir = join(__dirname, 'seeds');

  const files = readdirSync(seedsDir).filter(
    (file) => file.endsWith('.ts') || file.endsWith('.js'),
  );

  for (const file of files) {
    console.log(`Running seed: ${file}`);
    const seedModule = await import(join(seedsDir, file));

    if (typeof seedModule.default === 'function') {
      await seedModule.default();
    } else {
      console.warn(`⚠️  ${file} does not export a default function`);
    }
  }
}

main()
  .then(() => {
    console.log('🌱 Seeding complete');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Seeding failed', e);
    process.exit(1);
  });
