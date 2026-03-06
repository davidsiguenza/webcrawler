import { cp, mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyBranding } from '../src/lib/apply-branding.js';

test('applyBranding appends preset, css block and env activation', async () => {
  const templatePath = path.join(process.cwd(), 'test/fixtures/storefront-template');
  const tempPath = await mkdtemp(path.join(os.tmpdir(), 'webcrawler-apply-'));
  await cp(templatePath, tempPath, { recursive: true });

  const analysis = {
    brandId: 'camper',
    displayName: 'Camper',
    images: {
      logo: 'https://cdn.example.com/assets/camper-logo.svg',
    },
    tokens: {
      primary: '#d71920',
      primaryForeground: '#ffffff',
      background: '#faf8f4',
      foreground: '#111111',
      accent: '#f8d9db',
      accentForeground: '#111111',
      border: '#d9d1ca',
      ring: '#d71920',
    },
    content: {
      hero: {
        slide1: {
          title: 'Runner Twentyfive',
          subtitle: 'Tu sneaker 25/7.',
          ctaText: 'SHOP NOW',
          ctaLink: '/collections/runner-twentyfive',
          imageUrl: 'https://cdn.example.com/cms/runner_Desktop.jpg',
          imageAlt: 'Runner Twentyfive',
        },
        slide2: {
          title: 'Pelotas Soller',
          subtitle: 'La vida sencilla en una sneaker.',
          ctaText: 'SHOP NOW',
          ctaLink: '/collections/pelotas-soller',
          imageUrl: 'https://cdn.example.com/cms/pelotas_Desktop.jpg',
          imageAlt: 'Pelotas Soller',
        },
        slide3: {
          title: 'Niños Camper',
          subtitle: 'Zapatos cómodos y divertidos.',
          ctaText: 'SHOP NOW',
          ctaLink: '/collections/kids',
          imageUrl: 'https://cdn.example.com/cms/kids_Desktop.jpg',
          imageAlt: 'Niños Camper',
        },
      },
      featuredProducts: {
        title: 'Our Picks',
      },
      newArrivals: {
        title: 'Novedades de temporada',
        description: 'Nuevos modelos listos para estrenar.',
        ctaText: 'SHOP NOW',
        ctaLink: '/collections/new-arrivals',
        imageUrl: 'https://cdn.example.com/cms/new-arrivals_Desktop.jpg',
        imageAlt: 'Novedades de temporada',
      },
      categoryGrid: {
        title: 'Browse',
        shopNowButton: 'Shop',
      },
      featuredContent: {
        women: {
          title: 'Mujer',
          description: 'Descubre los iconos de la temporada.',
          ctaText: 'EXPLORE',
          ctaLink: '/women',
          imageUrl: 'https://cdn.example.com/cms/women_Desktop.jpg',
          imageAlt: 'Colección mujer',
        },
        men: {
          title: 'Hombre',
          description: 'Diseño cómodo para el día a día.',
          ctaText: 'EXPLORE',
          ctaLink: '/men',
          imageUrl: 'https://cdn.example.com/cms/men_Desktop.jpg',
          imageAlt: 'Colección hombre',
        },
      },
      pageTitle: 'Camper Store',
      pageDescription: 'Zapatos y sneakers para toda la familia.',
    },
  };

  await applyBranding(analysis, tempPath);

  const presets = await readFile(path.join(tempPath, 'src/config/branding-presets.ts'), 'utf8');
  const css = await readFile(path.join(tempPath, 'src/app.css'), 'utf8');
  const env = await readFile(path.join(tempPath, '.env'), 'utf8');

  assert.match(presets, /\bcamper:\s*{/);
  assert.match(presets, /Runner Twentyfive/);
  assert.match(css, /:root\[data-brand='camper'\]/);
  assert.match(css, /--primary: #d71920;/);
  assert.match(env, /^PUBLIC__app__global__branding__name=camper$/m);
});
