/**
 * dsh-custom-brand — host half.
 *
 * This bundle is purely client-side: the loader row exists so the web
 * profile activates the package and `dsh-client-modules` serves
 * /plugins/dsh-custom-brand/client.js. The host half intentionally provides
 * nothing; all behavior lives in the browser (lib/client.js).
 */
export const name = 'dsh-custom-brand';

export const inject = [];

export function apply() {}
