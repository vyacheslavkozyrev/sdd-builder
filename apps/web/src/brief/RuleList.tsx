interface RuleListProps {
  /** Names the rule inputs for assistive technology, for example "Code rule 2". */
  label: string;
  rules: readonly string[];
  onChange: (rules: string[]) => void;
}

/**
 * A list of rule texts, added and removed one at a time (F-05 AC-012). Blank rules are kept while
 * typing and dropped when the configuration is built, so no rule is a problem.
 */
export function RuleList({ label, rules, onChange }: RuleListProps) {
  return (
    <div className="rule-list">
      <ul>
        {rules.map((rule, index) => (
          <li key={index}>
            <input
              type="text"
              aria-label={`${label} ${index + 1}`}
              value={rule}
              onChange={(event) =>
                onChange(rules.map((item, position) => (position === index ? event.target.value : item)))
              }
            />
            <button type="button" onClick={() => onChange(rules.filter((_, position) => position !== index))}>
              Remove {label.toLowerCase()} {index + 1}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...rules, ''])}>
        + Add rule
      </button>
    </div>
  );
}
