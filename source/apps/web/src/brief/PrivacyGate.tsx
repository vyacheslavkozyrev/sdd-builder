import { PRIVACY_CHECKBOX_LABEL, PRIVACY_NOTICE } from './privacy.js';

interface PrivacyGateProps {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  /** True when the brief is valid and no request runs (`canAnalyze`). */
  analyzeEnabled: boolean;
  waiting: boolean;
  onAnalyze: () => void;
}

/**
 * The privacy notice, the checkbox and the Analyze button, as the "Before you analyze" block of
 * the F-05 brief screen (F-05 AC-014, AC-015, AC-016, AC-017, AC-020). The caller decides whether Analyze
 * is enabled; this component only shows it.
 */
export function PrivacyGate({
  accepted,
  onAcceptedChange,
  analyzeEnabled,
  waiting,
  onAnalyze,
}: PrivacyGateProps) {
  return (
    <div className="privacy-gate">
      <p className="privacy-notice">{PRIVACY_NOTICE}</p>
      <label className="privacy-check">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(event) => onAcceptedChange(event.target.checked)}
        />{' '}
        {PRIVACY_CHECKBOX_LABEL}
      </label>
      <p className="hint">Checkbox is required before Analyze is enabled.</p>
      <button type="button" disabled={!analyzeEnabled} onClick={onAnalyze}>
        {waiting ? 'Analyzing…' : 'Analyze (needs the checkbox)'}
      </button>
    </div>
  );
}
