const { getRendererConfiguration } = require('../utils/documentRenderer');

describe('document renderer configuration', () => {
  test('returns renderer configuration object with availability status', () => {
    const config = getRendererConfiguration();
    expect(config).toHaveProperty('available');
    expect(typeof config.available).toBe('boolean');
    if (config.available) {
      expect(['libreoffice', 'microsoft-word']).toContain(config.engine);
    } else {
      expect(config).toHaveProperty('reason');
    }
  });
});
