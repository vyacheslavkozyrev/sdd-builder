import { useState } from 'react';
import type { MapState } from '../builder/map-state.js';
import { canAnalyze } from '../brief/gate.js';
import { PrivacyGate } from '../brief/PrivacyGate.js';
import type { BriefState } from '../brief/state.js';
import { toProjectConfig } from '../brief/to-config.js';
import { analyzeBrief } from './request.js';
import type { AnalyzeOutcome, FetchFn } from './request.js';
import { createInFlightGuard } from './in-flight.js';
import type { InFlightGuard } from './in-flight.js';
import { findingRows, reviewNotice } from './result.js';
import type { FindingRow, ReviewView } from './result.js';

interface AnalysisPanelProps {
  brief: BriefState;
  map: MapState;
  onChange: (brief: BriefState) => void;
}

/** The browser's fetch, called through an arrow so it keeps its own `this`. */
const browserFetch: FetchFn = (url, init) => fetch(url, init);

function FindingsTable({ rows, empty }: { rows: readonly FindingRow[]; empty: string }) {
  if (rows.length === 0) {
    return <p className="hint">{empty}</p>;
  }
  return (
    <table className="findings">
      <thead>
        <tr>
          <th>Severity</th>
          <th>Subject</th>
          <th>Message</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            <td>{row.severity}</td>
            <td>{row.subject}</td>
            <td>{row.message}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReviewPart({ view }: { view: ReviewView }) {
  if (view.status !== 'ok') {
    return <p className="hint">{view.notice}</p>;
  }
  return (
    <>
      <h3>Review</h3>
      <FindingsTable rows={view.findings} empty="The review gave no findings." />
    </>
  );
}

/**
 * The Analyze block: the privacy gate, then the outcome of the last request. The brief is only
 * read here; a failed request leaves it as it was (F-05 AC-014 to AC-023).
 */
export function AnalysisPanel({ brief, map, onChange }: AnalysisPanelProps) {
  const [guard] = useState<InFlightGuard>(createInFlightGuard);
  const [waiting, setWaiting] = useState(false);
  const [outcome, setOutcome] = useState<AnalyzeOutcome | null>(null);

  const analyzeEnabled = canAnalyze(brief, brief.privacyAccepted, map) && !waiting;

  async function analyze() {
    const build = toProjectConfig(brief, map);
    if (build.ok === false || !canAnalyze(brief, brief.privacyAccepted, map) || !guard.start()) {
      return;
    }
    setWaiting(true);
    setOutcome(null);
    try {
      setOutcome(await analyzeBrief(browserFetch, build.config));
    } finally {
      guard.release();
      setWaiting(false);
    }
  }

  return (
    <section aria-labelledby="section-analyze">
      <h2 id="section-analyze">Before you analyze</h2>
      <PrivacyGate
        accepted={brief.privacyAccepted}
        onAcceptedChange={(privacyAccepted) => onChange({ ...brief, privacyAccepted })}
        analyzeEnabled={analyzeEnabled}
        waiting={waiting}
        onAnalyze={() => void analyze()}
      />
      {waiting && <p role="status">Analyzing the brief. This can take a moment.</p>}
      {outcome?.ok === false && <p role="alert">{outcome.message}</p>}
      {outcome?.ok === true && (
        <div className="analysis-result">
          <h3>Structural findings</h3>
          <FindingsTable rows={findingRows(outcome.result)} empty="No structural findings." />
          <ReviewPart view={reviewNotice(outcome.result.review)} />
        </div>
      )}
    </section>
  );
}
