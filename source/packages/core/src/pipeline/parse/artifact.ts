import {
  childPath,
  readList,
  readObject,
  readText,
  type ProblemCollector,
} from '../check/primitives.js';
import type { Artifact } from '../model.js';

// The outcome artifacts of a flow (pipeline-schema.md §2, `artifact`; decision 38; AC-036 to AC-039,
// AC-087). An artifact requires `label` and `template` and has no other key. The label is one non-blank
// line of at most 200 code points; the template may be empty and holds several lines of at most 5,000
// code points. A missing key is refused at the path of the artifact; an invalid artifact is left out of
// the result. Two artifacts of one flow with the same label are refused at the path of the second label.
// The list keeps the order of its array.

const ARTIFACT_KEYS: readonly string[] = ['label', 'template'];
const LABEL_RULE = { max: 200, nonBlank: true };
const TEMPLATE_RULE = { max: 5000 };

function readArtifact(value: unknown, path: string, problems: ProblemCollector): Artifact | undefined {
  const record = readObject(value, path, problems);
  if (record === undefined) return undefined;

  let complete = true;
  for (const key of Object.keys(record)) {
    if (!ARTIFACT_KEYS.includes(key)) {
      problems.add(childPath(path, key), `has an unknown key ${key}`);
      complete = false;
    }
  }
  for (const key of ARTIFACT_KEYS) {
    if (!Object.hasOwn(record, key)) {
      problems.add(path, `is missing the key ${key}`);
      complete = false;
    }
  }
  if (!complete) return undefined;

  const labelPath = childPath(path, 'label');
  const label = readText(record.label, labelPath, LABEL_RULE, problems);
  const template = readText(record.template, childPath(path, 'template'), TEMPLATE_RULE, problems);
  if (label === undefined || template === undefined) return undefined;
  // Every Unicode line terminator, not only LF and CR: a label must not break a line anywhere.
  if (/[\n\v\f\r\u0085\u2028\u2029]/.test(label)) {
    problems.add(labelPath, 'must be one line');
    return undefined;
  }
  return { label, template };
}

export function readArtifacts(value: unknown, path: string, problems: ProblemCollector): Artifact[] | undefined {
  const items = readList(value, path, problems);
  if (items === undefined) return undefined;

  const labels = new Set<string>();
  const artifacts: Artifact[] = [];
  items.forEach((item, index) => {
    const itemPath = childPath(path, String(index));
    const artifact = readArtifact(item, itemPath, problems);
    if (artifact === undefined) return;
    if (labels.has(artifact.label)) {
      problems.add(
        childPath(itemPath, 'label'),
        `repeats ${artifact.label}; each artifact of a flow needs its own label`,
      );
      return;
    }
    labels.add(artifact.label);
    artifacts.push(artifact);
  });
  return artifacts;
}
