import { describe, it, expect } from 'vitest';
import { extractFixture } from '../helpers/pdf';

describe('extraction PDF — inspection', () => {
  it.skip('clarified-sain : dump des lignes', async () => {
    const doc = await extractFixture('clarified-sain.pdf');
    expect(doc.charCount).toBeGreaterThan(200);
    // eslint-disable-next-line no-console
    console.log('pages=', doc.pageCount, 'producer=', doc.producer);
    for (const l of doc.lines) {
      // eslint-disable-next-line no-console
      console.log(
        `p${l.page} y${l.y.toFixed(0)} | ${l.cells.map((c) => `${c.text}@${c.x.toFixed(0)}-${c.xEnd.toFixed(0)}`).join(' ¦ ')}`,
      );
    }
  });
});
