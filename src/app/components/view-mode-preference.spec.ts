import { loadViewMode, saveViewMode } from './view-mode-preference';

describe('View mode preferences', () => {
  const clearPreferences = () => {
    for (const scope of ['distributor', 'brand', 'product']) {
      localStorage.removeItem(`${scope}-view-mode`);
    }
  };

  beforeEach(clearPreferences);
  afterEach(() => {
    vi.restoreAllMocks();
    clearPreferences();
  });

  it('defaults to grid for missing or invalid preferences', () => {
    expect(loadViewMode('brand')).toBe('grid');
    localStorage.setItem('brand-view-mode', 'invalid');
    expect(loadViewMode('brand')).toBe('grid');
  });

  it('keeps each screen preference independent and preserves other settings', () => {
    localStorage.setItem('product-profit-percentage', '25');
    try {
      saveViewMode('distributor', 'list');
      saveViewMode('brand', 'grid');
      saveViewMode('product', 'list');
      expect(loadViewMode('distributor')).toBe('list');
      expect(loadViewMode('brand')).toBe('grid');
      expect(loadViewMode('product')).toBe('list');
      expect(localStorage.getItem('product-profit-percentage')).toBe('25');
    } finally {
      localStorage.removeItem('product-profit-percentage');
    }
  });

  it('defaults to grid when reading storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    expect(loadViewMode('product')).toBe('grid');
  });

  it('does not interrupt the screen when saving storage fails', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(() => saveViewMode('distributor', 'list')).not.toThrow();
  });
});
