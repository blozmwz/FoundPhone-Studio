// Staged activation: author authentication and D1 reads can be verified while
// public collection stays disabled even if an old server variable is still 1.
import worker from './worker.mjs';
export default {
  fetch(request, env) {
    return worker.fetch(request, { ...env, ANALYTICS_ENABLED: '0' });
  },
};
