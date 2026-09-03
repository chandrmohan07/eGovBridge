/**
 * SIH Government Service Integration Platform — Data Minimization Engine
 * Strips unpermitted or non-requested fields from canonical payloads before transfer.
 * Only transmits strictly the minimum necessary data to target department.
 */

import { CANONICAL_VERSION } from '../standardization/schemas.js';

export function minimizeData(canonicalPayload, permittedFields = []) {
  if (!canonicalPayload || typeof canonicalPayload !== 'object') {
    return {
      minimizedData: {},
      strippedFields: []
    };
  }

  const minimizedData = {
    canonicalVersion: canonicalPayload.canonicalVersion || CANONICAL_VERSION
  };

  const strippedFields = [];
  const permittedSet = new Set(permittedFields);

  for (const [key, value] of Object.entries(canonicalPayload)) {
    if (key === 'canonicalVersion') continue;

    if (permittedSet.has(key)) {
      // Safe deep copy of permitted field
      minimizedData[key] = JSON.parse(JSON.stringify(value));
    } else {
      strippedFields.push(key);
    }
  }

  return {
    minimizedData,
    strippedFields
  };
}
