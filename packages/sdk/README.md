# @google/gemini-cli-sdk

The Gemini CLI SDK provides a programmatic interface to interact with Gemini
models and tools.

## Installation

```bash
npm install @google/gemini-cli-sdk
```

## Browser-safe imports

The full SDK runtime is still Node.js-oriented, but browser builds can safely
import lightweight helpers from the package root via the `browser` export
condition or explicitly from `@google/gemini-cli-sdk/browser`.

## Usage

```typescript
import { GeminiCliAgent } from '@google/gemini-cli-sdk';

async function main() {
  const agent = new GeminiCliAgent({
    instructions: 'You are a helpful assistant.',
  });

  const controller = new AbortController();
  const signal = controller.signal;

  // Stream responses from the agent
  const stream = agent.sendStream('Why is the sky blue?', signal);

  for await (const chunk of stream) {
    if (chunk.type === 'content') {
      process.stdout.write(chunk.value.text || '');
    }
  }
}

main().catch(console.error);
```
