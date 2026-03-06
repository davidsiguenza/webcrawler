import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeBrand } from '../src/lib/brand-analyzer.js';
import { loadDocument } from '../src/lib/dom.js';

test('analyzeBrand selects the expected branded demo slots', async () => {
  const fixturePath = path.join(process.cwd(), 'test/fixtures/sample-brand.html');
  const html = await readFile(fixturePath, 'utf8');
  const $ = loadDocument(html, 'https://www.camper.com/es_ES');

  const analysis = await analyzeBrand({
    $,
    pageUrl: 'https://www.camper.com/es_ES',
    requestedUrl: 'https://www.camper.com/es_ES',
    html,
    onlyMainContent: true,
    brandId: 'camper',
  });

  assert.equal(analysis.displayName, 'Camper');
  assert.equal(analysis.images.logo, 'https://cdn.example.com/assets/camper-logo.svg');
  assert.equal(analysis.content.hero.slide1.title, 'Runner Twentyfive');
  assert.equal(analysis.content.hero.slide2.title, 'Pelotas Soller');
  assert.equal(analysis.content.hero.slide3.title, 'Niños Camper');
  assert.equal(analysis.content.newArrivals.title, 'Novedades de temporada');
  assert.equal(analysis.content.featuredContent.women.title, 'Mujer');
  assert.equal(analysis.content.featuredContent.men.title, 'Hombre');
  assert.equal(analysis.tokens.primary, '#d71920');
  assert.equal(analysis.tokens.background, '#faf8f4');
});
