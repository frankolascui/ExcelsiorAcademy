import { describe, expect, it } from 'vitest';
import { checkCloud } from './cloud';

const fake = (ok: boolean) => (async () => ({ ok }) as Response) as typeof fetch;

describe('checkCloud', () => {
  it('conectado cuando Supabase responde bien', async () => {
    expect(await checkCloud(fake(true))).toBe('conectado');
  });
  it('error cuando Supabase responde con fallo', async () => {
    expect(await checkCloud(fake(false))).toBe('error');
  });
  it('error cuando no hay red', async () => {
    const offline = (async () => { throw new Error('sin red'); }) as typeof fetch;
    expect(await checkCloud(offline)).toBe('error');
  });
});
