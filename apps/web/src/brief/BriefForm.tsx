import { AnalysisPanel } from '../analyze/AnalysisPanel.js';
import { ideaCounter } from './counter.js';
import { Messages } from './Messages.js';
import { ModuleRows } from './ModuleRows.js';
import { isShownBeside, messagesAt } from './placement.js';
import { progressEntries } from './progress.js';
import type { ProgressEntry } from './progress.js';
import { RuleList } from './RuleList.js';
import type { BriefState } from './state.js';
import { validateBrief } from './validate.js';

interface BriefFormProps {
  brief: BriefState;
  onChange: (brief: BriefState) => void;
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  messages: readonly string[];
  onChange: (value: string) => void;
}

const PROGRESS_MARKS: Record<ProgressEntry['status'], string> = {
  valid: '✓',
  incomplete: '○',
  optional: '○',
};

function TextField({ id, label, value, messages, onChange }: TextFieldProps) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" value={value} onChange={(event) => onChange(event.target.value)} />
      <Messages messages={messages} />
    </div>
  );
}

/**
 * The brief form, sections 1 to 5 of `02-brief.svg`, then the progress panel. The form only
 * renders the state it is given; every change goes back through `onChange` (F-05 AC-001 to AC-013).
 */
export function BriefForm({ brief, onChange }: BriefFormProps) {
  const problems = validateBrief(brief);
  const others = problems.filter((problem) => !isShownBeside(problem.path));

  const setStack = (field: keyof BriefState['stack'], value: string) =>
    onChange({ ...brief, stack: { ...brief.stack, [field]: value } });
  const setArchitecture = (patch: Partial<BriefState['architecture']>) =>
    onChange({ ...brief, architecture: { ...brief.architecture, ...patch } });

  return (
    <form className="brief-form" onSubmit={(event) => event.preventDefault()}>
      <section aria-labelledby="section-idea">
        <h2 id="section-idea">1. Idea</h2>
        <p className="hint">what the product is, who uses it, what problem it solves</p>
        <TextField
          id="project-name"
          label="Project name"
          value={brief.name}
          messages={messagesAt(problems, 'name')}
          onChange={(name) => onChange({ ...brief, name })}
        />
        <div className="field">
          <label htmlFor="idea">Idea</label>
          <textarea
            id="idea"
            rows={5}
            placeholder="Hourly Tracker helps a household see when electricity is cheap…"
            value={brief.idea}
            onChange={(event) => onChange({ ...brief, idea: event.target.value })}
          />
          <p className="hint">Describe the product in your own words. Plain language works best.</p>
          <p className="counter">{ideaCounter(brief.idea)}</p>
          <Messages messages={messagesAt(problems, 'idea')} />
        </div>
      </section>

      <section aria-labelledby="section-stack">
        <h2 id="section-stack">2. Stack</h2>
        <TextField
          id="stack-language"
          label="Language"
          value={brief.stack.language}
          messages={messagesAt(problems, 'stack.language')}
          onChange={(value) => setStack('language', value)}
        />
        <TextField
          id="stack-framework"
          label="Framework"
          value={brief.stack.framework}
          messages={messagesAt(problems, 'stack.framework')}
          onChange={(value) => setStack('framework', value)}
        />
        <TextField
          id="stack-test-framework"
          label="Test framework"
          value={brief.stack.testFramework}
          messages={messagesAt(problems, 'stack.testFramework')}
          onChange={(value) => setStack('testFramework', value)}
        />
        <TextField
          id="stack-build-tool"
          label="Build tool"
          value={brief.stack.buildTool}
          messages={messagesAt(problems, 'stack.buildTool')}
          onChange={(value) => setStack('buildTool', value)}
        />
      </section>

      <section aria-labelledby="section-architecture">
        <h2 id="section-architecture">3. Architecture</h2>
        <TextField
          id="architecture-style"
          label="Style"
          value={brief.architecture.style}
          messages={messagesAt(problems, 'architecture.style')}
          onChange={(style) => setArchitecture({ style })}
        />
        <p className="field-label">Modules</p>
        <Messages messages={messagesAt(problems, 'architecture.modules')} />
        <ModuleRows
          rows={brief.architecture.modules}
          problems={problems}
          onChange={(modules) => setArchitecture({ modules })}
        />
      </section>

      <section aria-labelledby="section-code-rules">
        <h2 id="section-code-rules">4. Code rules</h2>
        <RuleList
          label="Code rule"
          rules={brief.codeRules}
          onChange={(codeRules) => onChange({ ...brief, codeRules })}
        />
      </section>

      <section aria-labelledby="section-test-rules">
        <h2 id="section-test-rules">5. Test rules</h2>
        <RuleList
          label="Test rule"
          rules={brief.testRules}
          onChange={(testRules) => onChange({ ...brief, testRules })}
        />
      </section>

      {others.length > 0 && (
        <section aria-labelledby="section-other-problems">
          <h2 id="section-other-problems">Other problems to fix</h2>
          <ul>
            {others.map((problem) => (
              <li key={`${problem.path}: ${problem.reason}`}>
                {problem.path}: {problem.reason}
              </li>
            ))}
          </ul>
        </section>
      )}

      <AnalysisPanel brief={brief} onChange={onChange} />

      <section aria-labelledby="section-progress">
        <h2 id="section-progress">Progress</h2>
        <ul className="progress">
          {progressEntries(brief).map((entry) => (
            <li key={entry.key}>
              <span aria-hidden="true">{PROGRESS_MARKS[entry.status]}</span> {entry.label}
              {entry.status === 'incomplete' ? ' (incomplete)' : ''}
            </li>
          ))}
        </ul>
        <p className="hint">Nothing is saved between visits in the MVP.</p>
        <p className="hint">Reloading the page clears the brief.</p>
      </section>
    </form>
  );
}
