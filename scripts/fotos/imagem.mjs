// Conversão das fotos: HEIC do iPhone vira JPEG (heif-convert, do pacote libheif-examples), depois o
// sharp gera as versões publicadas. O sharp descarta o EXIF por padrão, então GPS e modelo do
// celular não vão para o ar.
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);

export async function decodificar(buf, heic) {
  if (!heic) return buf;
  const dir = await mkdtemp(join(tmpdir(), 'fa-heic-'));
  try {
    await writeFile(join(dir, 'in.heic'), buf);
    await run('heif-convert', ['-q', '95', join(dir, 'in.heic'), join(dir, 'out.jpg')], { timeout: 120000 });
    return await readFile(join(dir, 'out.jpg'));
  } catch (e) {
    throw new Error(`HEIC não convertido (instale libheif-examples e libheif-plugin-libde265): ${e.message}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** JPEG reduzido que vai para a IA (1280 px no lado maior é suficiente e custa pouco). */
export async function previa(buf) {
  return (await sharp(buf).rotate().flatten({ background: '#ffffff' }).resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 }).toBuffer()).toString('base64');
}

/**
 * Versões publicadas: 1600 px (webp + jpg, para TV e telas grandes) e 720 px (webp, para as
 * grades das landings no celular).
 */
export async function versoes(buf) {
  const base = () => sharp(buf).rotate().flatten({ background: '#ffffff' });
  const grande = { fit: 'inside', withoutEnlargement: true };
  const webp = await base().resize(1600, 1600, grande).webp({ quality: 78 }).toBuffer({ resolveWithObject: true });
  const jpg = await base().resize(1600, 1600, grande).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  const p = await base().resize(720, 720, grande).webp({ quality: 72 }).toBuffer();
  return { webp: webp.data, jpg, p, dims: { w: webp.info.width, h: webp.info.height } };
}
