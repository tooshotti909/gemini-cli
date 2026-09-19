/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  type ToolResult,
  type ToolInvocation,
  type ExecuteOptions,
  Kind,
  type MessageBus,
} from '@google/gemini-cli-core';
import type { z, type Tool } from './tool-definition.js';
import type { SessionContext } from './types.js';
import { ModelVisibleError } from './tool-definition.js';

class SdkToolInvocation<T extends z.ZodTypeAny> extends BaseToolInvocation<
  z.infer<T>,
  ToolResult
> {
  constructor(
    params: z.infer<T>,
    messageBus: MessageBus,
    private readonly action: (
      params: z.infer<T>,
      context?: SessionContext,
    ) => Promise<unknown>,
    private readonly context: SessionContext | undefined,
    toolName: string,
    private readonly sendErrorsToModel: boolean = false,
  ) {
    super(params, messageBus, toolName);
  }

  getDescription(): string {
    return `Executing ${this._toolName}...`;
  }

  async execute({
    abortSignal: _abortSignal,
    updateOutput: _updateOutput,
  }: ExecuteOptions): Promise<ToolResult> {
    try {
      const result = await this.action(this.params, this.context);
      const output =
        typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return {
        llmContent: output,
        returnDisplay: output,
      };
    } catch (error) {
      if (this.sendErrorsToModel || error instanceof ModelVisibleError) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          llmContent: `Error: ${errorMessage}`,
          returnDisplay: `Error: ${errorMessage}`,
          error: {
            message: errorMessage,
          },
        };
      }
      throw error;
    }
  }
}

/**
 * A wrapper that integrates an SDK {@link Tool} into the core tool registry.
 *
 * Handles parameter validation, execution, error handling (including
 * {@link ModelVisibleError}), and context binding for tool invocations.
 *
 * @typeParam T - The Zod schema type that validates the tool's input parameters.
 */
export class SdkTool<T extends z.ZodTypeAny> extends BaseDeclarativeTool<
  z.infer<T>,
  ToolResult
> {
  constructor(
    private readonly definition: Tool<T>,
    messageBus: MessageBus,
    _agent?: unknown,
    private readonly context?: SessionContext,
  ) {
    super(
      definition.name,
      definition.name,
      definition.description,
      Kind.Other,
      zodToJsonSchema(definition.inputSchema),
      messageBus,
    );
  }

  bindContext(context: SessionContext): SdkTool<T> {
    return new SdkTool(this.definition, this.messageBus, undefined, context);
  }

  createInvocationWithContext(
    params: z.infer<T>,
    messageBus: MessageBus,
    context: SessionContext | undefined,
    toolName?: string,
  ): ToolInvocation<z.infer<T>, ToolResult> {
    return new SdkToolInvocation(
      params,
      messageBus,
      this.definition.action,
      context ?? this.context,
      toolName || this.name,
      this.definition.sendErrorsToModel,
    );
  }

  protected createInvocation(
    params: z.infer<T>,
    messageBus: MessageBus,
    toolName?: string,
  ): ToolInvocation<z.infer<T>, ToolResult> {
    return new SdkToolInvocation(
      params,
      messageBus,
      this.definition.action,
      this.context,
      toolName || this.name,
      this.definition.sendErrorsToModel,
    );
  }
}
