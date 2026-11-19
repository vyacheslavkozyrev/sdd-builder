import { childPath, ROOT_PATH } from './primitives.js';
import type { Problem, ProjectConfig, RuleTag } from '../model.js';

// Rule tags name rules of the project (decisions 20, 21; AC-024, AC-052, AC-070). A `ruleTags` list on the
// pipeline, on a flow or on an agent block names rule ids of `rules`. A tag that names no rule is refused at
// the path of the tag. The format of a tag and its repeats are checked by the reader (AC-071, AC-072), so only
// tags that were read are seen here. Returns the problems in document order; an empty list means every tag
// names a rule.

const PIPELINE_PATH = childPath(ROOT_PATH, 'pipeline');
const FLOWS_PATH = childPath(PIPELINE_PATH, 'flows');

function checkTags(
  tags: readonly RuleTag[] | undefined,
  listPath: string,
  ruleIds: ReadonlySet<string>,
  problems: Problem[],
): void {
  tags?.forEach((tag) => {
    if (!ruleIds.has(tag.ruleId)) {
      problems.push({
        path: childPath(listPath, String(tag.index)),
        message: `must name a rule of this project, got ${tag.ruleId}`,
      });
    }
  });
}

export function checkRuleTags(config: Pick<ProjectConfig, 'rules' | 'pipeline'>): Problem[] {
  const { rules, pipeline } = config;
  const ruleIds = new Set(rules.map((rule) => rule.id));
  const problems: Problem[] = [];

  checkTags(pipeline.ruleTags, childPath(PIPELINE_PATH, 'ruleTags'), ruleIds, problems);
  pipeline.flows.forEach((flow) => {
    const flowPath = childPath(FLOWS_PATH, String(flow.index));
    checkTags(flow.ruleTags, childPath(flowPath, 'ruleTags'), ruleIds, problems);
    flow.blocks.forEach((block) => {
      if (block.kind !== 'agent') return;
      const blockPath = childPath(childPath(flowPath, 'blocks'), String(block.index));
      checkTags(block.ruleTags, childPath(blockPath, 'ruleTags'), ruleIds, problems);
    });
  });

  return problems;
}
