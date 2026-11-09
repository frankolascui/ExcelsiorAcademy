import { describe, expect, it } from 'vitest';
import { headingsOf, smartFormat, tidyText } from './format';

describe('tidyText (al pegar)', () => {
  it('convierte viñetas raras en listas', () => {
    expect(tidyText('• uno\n● dos\n– tres\n→ cuatro')).toBe('- uno\n- dos\n- tres\n- cuatro\n');
  });
  it('respeta la sangría de las sublistas', () => {
    expect(tidyText('• padre\n\t◦ hijo')).toBe('- padre\n  - hijo\n');
  });
  it('numera bien y marca los apartados a), b)', () => {
    expect(tidyText('1) Emisor\n2) Receptor\na) primero')).toBe('1. Emisor\n2. Receptor\n- **a)** primero\n');
  });
  it('deja como mucho una línea en blanco seguida', () => {
    expect(tidyText('a\n\n\n\nb')).toBe('a\n\nb\n');
  });
  it('no confunde un guion de palabra con una viñeta', () => {
    expect(tidyText('físico-químico')).toBe('físico-químico\n');
  });
});

describe('smartFormat (botón Ordenar formato)', () => {
  it('mayúsculas → apartado y "Concepto: definición" → negrita', () => {
    const r = smartFormat('LOS ELEMENTOS DE LA COMUNICACIÓN\nEmisor: quien envía el mensaje.\nTipos de ruido:\n• físico');
    expect(r).toBe('## Los elementos de la comunicación\n**Emisor:** quien envía el mensaje.\n### Tipos de ruido\n- físico\n');
  });
  it('no toca lo que ya tiene formato', () => {
    const md = '# Título\n- **Emisor:** ya está\n$$a$$\n';
    expect(smartFormat(md)).toBe(md);
  });
});

describe('headingsOf (índice)', () => {
  it('saca ## y ### con identificadores únicos', () => {
    const r = headingsOf('# Tema\n## Ruido\n### Tipos\n## Ruido\n```\n## no es título\n```');
    expect(r).toEqual([
      { level: 2, text: 'Ruido', slug: 'ruido' },
      { level: 3, text: 'Tipos', slug: 'tipos' },
      { level: 2, text: 'Ruido', slug: 'ruido-1' },
    ]);
  });
});
