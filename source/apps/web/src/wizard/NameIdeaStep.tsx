import { ideaCounter } from './counter.js';
import { setIdea, setName } from './name-idea.js';
import type { NameIdeaValues } from './name-idea.js';

interface NameIdeaStepProps {
  values: NameIdeaValues;
  onChange: (values: NameIdeaValues) => void;
}

/**
 * Step 1: the project name and the idea, both required (F-05 AC-007 to AC-009). The values are
 * stored as typed or cut to the cap by the state functions; this view only renders them.
 */
export function NameIdeaStep({ values, onChange }: NameIdeaStepProps) {
  return (
    <>
      <p className="hint">The name and the idea are required. The rest of the process follows from them.</p>
      <div className="field">
        <label htmlFor="project-name">
          Project name <span className="required">*</span>
        </label>
        <input
          id="project-name"
          type="text"
          value={values.name}
          onChange={(event) => onChange(setName(values, event.target.value))}
        />
        <p className="hint">A short name. It appears as the project name in the generated CLAUDE.md.</p>
      </div>
      <div className="field">
        <label htmlFor="project-idea">
          Idea <span className="required">*</span>
        </label>
        <textarea
          id="project-idea"
          rows={8}
          value={values.idea}
          onChange={(event) => onChange(setIdea(values, event.target.value))}
        />
        <p className="counter counter-row">{ideaCounter(values.idea)}</p>
        <p className="hint">Describe what the product does and who uses it. Leave out how it is built.</p>
        <p className="hint">Nothing is stored between visits. Reloading clears the wizard.</p>
        <p className="hint">Up to 8,000 characters. Text past the limit is cut.</p>
      </div>
    </>
  );
}
