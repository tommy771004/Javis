import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildRuntimeTranslationOverrides,
  getTranslations,
  type RuntimeTranslationInput,
} from '../src/services/i18n';

test('buildRuntimeTranslationOverrides maps dynamic workspace identity onto translated copy slots', () => {
  const overrides = buildRuntimeTranslationOverrides('zh-TW', {
    satelliteName: '專案資料庫',
    brandName: 'Atlas Console',
    footerClassified: 'ATLAS // WORKSPACE',
  });

  assert.equal(overrides.lblStarkSat4, '專案資料庫');
  assert.equal(overrides.brandName, 'Atlas Console');
  assert.equal(overrides.lblClassified, 'ATLAS // WORKSPACE');
});

test('buildRuntimeTranslationOverrides accepts grouped runtime override payloads', () => {
  const input: RuntimeTranslationInput = {
    overrides: {
      brandMotto: 'Configurable copy source',
      lblCopyright: '© Configurable Workspace',
    },
  };

  const overrides = buildRuntimeTranslationOverrides('en', input);

  assert.equal(overrides.brandMotto, 'Configurable copy source');
  assert.equal(overrides.lblCopyright, '© Configurable Workspace');
});

test('getTranslations merges runtime overrides over the locale defaults', () => {
  const translations = getTranslations('en', {
    brandName: 'Atlas Console',
    lblStarkSat4: 'Project Database',
  });

  assert.equal(translations.brandName, 'Atlas Console');
  assert.equal(translations.lblStarkSat4, 'Project Database');
  assert.equal(translations.systemStatus, 'SYSTEM STATUS');
});
