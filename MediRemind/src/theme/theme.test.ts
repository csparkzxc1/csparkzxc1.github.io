import { describe, expect, it } from '@jest/globals';
import { scaleText } from './theme';

describe('scaleText', () => {
  const styles = {
    title: { fontSize: 20, lineHeight: 26, color: '#000' },
    box: { padding: 10 },
  };

  it('scales font size and line height only', () => {
    const big = scaleText(styles, 1.4);
    expect(big.title).toEqual({ fontSize: 28, lineHeight: 36, color: '#000' });
    expect(big.box).toEqual({ padding: 10 });
  });

  it('returns the same object at normal size', () => {
    expect(scaleText(styles, 1)).toBe(styles);
  });
});
