// Custom image service that extends the default sharp service.
// Overrides getRemoteSize to return safe defaults instead of making network
// requests for external images — avoiding failures on expired/inaccessible URLs.
import sharpService from 'astro/assets/services/sharp';

export default {
  ...sharpService,
  async getRemoteSize(_url) {
    return { width: 800, height: 600 };
  },
};
