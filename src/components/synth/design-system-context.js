'use client';

import { createContext, useContext } from 'react';
import * as meta from '@/design-systems/meta';

/*
 * The design-system library (a style's public exports) that synth components render with.
 * Defaults to the meta style; a DesignSystemProvider swaps in another library, as the
 * design-system pages do to show real widgets in their style.
 */
const DesignSystemContext = createContext(meta);

export const DesignSystemProvider = DesignSystemContext.Provider;

export function useDesignSystem() {
  return useContext(DesignSystemContext);
}
