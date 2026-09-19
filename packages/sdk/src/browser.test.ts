/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

describe('browser entry', () => {
  it('bundles for browser targets without node builtins', async () => {
    const result = await build({
      stdin: {
        contents: `
          import { tool, z, skillDir } from './src/browser.ts';

          const exampleTool = tool(
            {
              name: 'browser_safe_tool',
              description: 'A browser-safe tool definition',
              inputSchema: z.object({ value: z.string() }),
            },
            async ({ value }) => value.toUpperCase(),
          );

          console.log(exampleTool.name, skillDir('/tmp').type);
        `,
        resolveDir: packageRoot,
        sourcefile: 'browser-entry-fixture.ts',
        loader: 'ts',
      },
      bundle: true,
      format: 'esm',
      platform: 'browser',
      write: false,
    });

    expect(result.outputFiles).toHaveLength(1);
    expect(result.outputFiles[0].text).not.toContain('node:');
  });

  it('declares browser package exports', async () => {
    const { default: sdkPackage } = await import('../package.json', {
      with: { type: 'json' },
    });

    expect(sdkPackage.exports['./browser'].default).toBe('./dist/browser.js');
    expect(sdkPackage.exports['./browser'].types).toBe('./dist/browser.d.ts');
    expect(sdkPackage.exports['./dist/*']).toBe('./dist/*');
  });
});
