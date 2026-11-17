// The review request (architecture.md §4, decision 37; US-003). The prompt is fixed text held here, in the API.
// The request is the prompt plus the JSON text of the brief and the pipeline config, with a fixed key order, so
// the same input gives the same request text.

import type { pipeline } from '@sddbuilder/core';

export interface ReviewRequest {
  readonly prompt: string;
  readonly json: string;
}

export const REVIEW_PROMPT = `You review a project brief and the SDD process designed for it.

The input is a JSON object with three keys: "brief" (the project's name, idea, architecture and stack), "rules" (the project rules) and "pipeline" (the commands, flows and blocks of the process). Read all of it.

Look for problems a developer would hit when this process runs on this project: a brief that is vague or contradicts itself, a stack that does not fit the idea, a block whose description does not match its name, a rule that conflicts with another rule or with the process, and a process step that is missing for the work the brief describes.

Reply with only a JSON array and no other text. Each element is an object with three string keys:
- "severity": "warning" for a problem that should be fixed, or "info" for a remark.
- "subject": a short name of the part concerned, such as "brief.stack" or "pipeline.flows.build".
- "message": one or two sentences that say what is wrong and what to do about it.

Give at most 10 elements. If you find no problem, reply with an empty array [].
Do not rewrite the brief or the process, and do not quote the brief back in full.`;

// Returns the value with every object's keys in sorted order, so the JSON text does not depend on the order in which
// the caller built the objects. Arrays keep their order.
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      sorted[key] = sortKeys(record[key]);
    }
    return sorted;
  }
  return value;
}

// The request for one review: the fixed prompt and the JSON of the brief and the pipeline config. The brief keeps
// its fixed key order, and the rules and the pipeline have their keys sorted. A blank brief field reads as an empty
// string, so a config without the brief gives the same text as one that has blank fields.
export function reviewRequest(config: pipeline.ProjectConfig): ReviewRequest {
  const value = {
    brief: {
      name: config.name ?? '',
      idea: config.idea ?? '',
      architecture: config.architecture ?? '',
      stack: {
        language: config.stack?.language ?? '',
        framework: config.stack?.framework ?? '',
        platform: config.stack?.platform ?? '',
        buildTool: config.stack?.buildTool ?? '',
        testFramework: config.stack?.testFramework ?? '',
      },
    },
    rules: sortKeys(config.rules),
    pipeline: sortKeys(config.pipeline),
  };
  return { prompt: REVIEW_PROMPT, json: JSON.stringify(value, null, 2) };
}
