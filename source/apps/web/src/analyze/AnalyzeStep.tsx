import { useMemo, useRef, useState } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { analysisError, analysisResult, configKey, isGreen, isOutOfDate, startAnalysis, type AnalysisState } from './analysisState.js';
import { buildProjectConfig } from './config.js';
import { saveFile, PROJECT_ZIP_NAME } from './download.js';
import { generateReply, type GenerateState } from './generate.js';
import { Findings } from './Findings.js';
import { getAnalyzeStepStyles } from './analyzeStepStyles.js';
import { PrivacyNotice } from './PrivacyNotice.js';
import { ProjectPreview } from './ProjectPreview.js';
import { parseAnalysisReply } from './reply.js';
import { postFile, postJson, type FetchFn, type RequestOutcome } from './request.js';
import { projectTree } from './tree.js';
import type { WizardValues } from '../wizard/state.js';

// Step 4, the Analyze column and the project preview (F-13 AC-003, AC-005, AC-006, AC-014, AC-018, AC-019, AC-020).
// The step holds the privacy tick and the analysis state in memory and nothing else: no browser storage and no log.
// Analyze sends one POST /analyze with the configuration built from the wizard values, and the outcome is stored with
// the configuration key it ran on. Generate and download sends one POST /generate with the same configuration and saves
// the zip; its pending state locks the step (screen 08). The views take the state as it is.

type Templates = Parameters<typeof projectTree>[1];

const NOT_RUN: AnalysisState = { kind: 'not-run' };
const GENERATE_IDLE: GenerateState = { kind: 'idle' };
const GENERATE_PENDING: GenerateState = { kind: 'pending' };
const SUBHEADING = 'Checks the brief and the pipeline. Run it again after each change.';
const browserFetch: FetchFn = (url, init) => fetch(url, init);

// The state of a finished request under the key it ran on. A 200 whose body is not an analysis result is an error:
// it lists no findings and shows through the same error message as the other error replies.
function outcomeState(key: string, outcome: RequestOutcome): AnalysisState {
  if (outcome.kind === 'ok') {
    const result = parseAnalysisReply(outcome.body);
    return result === null ? analysisError(key, 200, outcome.body) : analysisResult(key, result);
  }
  return analysisError(key, outcome.status, outcome.body);
}

export interface AnalyzeStepProps {
  readonly values: WizardValues;
  readonly templates: Templates;
  // The request function; the browser's fetch unless a test passes a fake.
  readonly fetchFn?: FetchFn;
  // Saves the zip; the browser's download unless a test passes a fake.
  readonly save?: (blob: Blob, name: string) => void;
}

export function AnalyzeStep({ values, templates, fetchFn = browserFetch, save = saveFile }: AnalyzeStepProps) {
  const styles = getAnalyzeStepStyles(useTheme());
  const [ticked, setTicked] = useState(false);
  const [state, setState] = useState<AnalysisState>(NOT_RUN);
  const [generation, setGeneration] = useState<GenerateState>(GENERATE_IDLE);
  // Set while a request is in flight. It is read and written in the same tick as the click, so a second click
  // before the pending state renders still sends no request.
  const inFlight = useRef(false);
  const generating = useRef(false);

  const config = useMemo(() => buildProjectConfig(values), [values]);
  const key = useMemo(() => configKey(config), [config]);
  const tree = useMemo(() => projectTree(config, templates), [config, templates]);
  const pending = state.kind === 'pending';
  const writing = generation.kind === 'pending';

  // The action. It refuses to run while the privacy box is unticked (AC-003) or while a request is in flight (AC-006).
  async function analyze(): Promise<void> {
    if (!ticked || inFlight.current) return;
    inFlight.current = true;
    setState(startAnalysis(key));
    try {
      const outcome = await postJson('/analyze', config, fetchFn);
      setState(outcomeState(key, outcome));
    } finally {
      inFlight.current = false;
    }
  }

  // The action of Generate and download. It sends nothing unless the analysis is green on this configuration (AC-025)
  // and no other generation is in flight (AC-026). A zip is saved; any other reply is shown as text (AC-027 to AC-029).
  async function generate(): Promise<void> {
    if (!isGreen(state, key) || generating.current) return;
    generating.current = true;
    setGeneration(GENERATE_PENDING);
    try {
      const reply = generateReply(await postFile('/generate', config, fetchFn));
      if (reply.kind === 'save') {
        save(reply.blob, PROJECT_ZIP_NAME);
        setGeneration(GENERATE_IDLE);
      } else {
        setGeneration({ kind: 'error', failure: reply.failure });
      }
    } catch (error) {
      // A save that throws must not leave the step locked; the error itself is not swallowed.
      setGeneration(GENERATE_IDLE);
      throw error;
    } finally {
      generating.current = false;
    }
  }

  return (
    <Box sx={styles.columns}>
      <Box sx={styles.analyzeColumn}>
        <Typography component="h2" sx={styles.heading}>
          Analyze
        </Typography>
        <Typography component="p" sx={styles.subheading}>
          {SUBHEADING}
        </Typography>
        <PrivacyNotice
          ticked={ticked}
          pending={pending}
          locked={writing}
          onTickedChange={setTicked}
          onAnalyze={() => {
            void analyze();
          }}
        />
        <Findings state={state} configKey={key} stale={isOutOfDate(state, key)} />
      </Box>
      <Box sx={styles.previewColumn}>
        <ProjectPreview
          tree={tree}
          state={state}
          configKey={key}
          generation={generation}
          onGenerate={() => {
            void generate();
          }}
        />
      </Box>
    </Box>
  );
}
