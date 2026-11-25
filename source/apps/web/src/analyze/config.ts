// The project configuration that the analysis and the generation receive (F-13 AC-005). It is built from the
// wizard values in memory: pure, with no React and no I/O. The same values give the same configuration.

import type { pipeline as core } from '@sddbuilder/core';
import { toDocument } from '../builder/fields.js';
import { ideaForConfig } from '../wizard/project.js';
import { ruleId } from '../wizard/technical.js';
import type { WizardValues } from '../wizard/state.js';

// The configuration of the wizard values. The idea is trimmed as in F-09; the name, the stack and the
// architecture are sent as typed. Each rule block becomes `{index, id, title, text}`, with its position as
// the index and the id derived from its name. The pipeline is the builder's value, as it is held. This is the
// configuration as the parser numbers it; the request body is built from it by `buildRequestBody`.
export function buildProjectConfig(values: WizardValues): core.ProjectConfig {
  return {
    schemaVersion: 2,
    name: values.name,
    idea: ideaForConfig(values.idea),
    architecture: values.architecture,
    stack: {
      language: values.stack.language,
      framework: values.stack.framework,
      platform: values.stack.platform,
      buildTool: values.stack.buildTool,
      testFramework: values.stack.testFramework,
    },
    rules: values.rules.map((rule, index) => ({ index, id: ruleId(rule.name), title: rule.name, text: rule.description })),
    pipeline: values.pipeline,
  };
}

// The body of /analyze and /generate (F-16 AC-011, AC-012). The pipeline schema has no `index`: the parser numbers
// every list item by its position, and refuses a key it does not know. So the body is the document form of the
// configuration (`toDocument`): no `index` at any level, and each rule tag written as its rule id.
export function buildRequestBody(values: WizardValues): unknown {
  return toDocument(buildProjectConfig(values));
}
