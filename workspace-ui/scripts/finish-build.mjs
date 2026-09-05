import { readFile, writeFile, copyFile, cp } from 'node:fs/promises';
for (const file of ['dist/index.js', 'dist/index.d.ts']) {
  const text = await readFile(file, 'utf8');
  await writeFile(file, text.replaceAll("'./theme'", "'./theme.js'"));
}
await copyFile('src/styles.css', 'dist/styles.css');

await cp('src/fonts', 'dist/fonts', { recursive: true });
