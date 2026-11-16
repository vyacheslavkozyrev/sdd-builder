import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as root from '../src/index.js';
import type {
  AnalysisFinding,
  AnalysisResult,
  AnalysisReview,
  Condition,
  ConfigProblem,
  Gate,
  GateType,
  MapConnection,
  ModuleSpec,
  ProjectConfig,
  RouteTarget,
  Scope,
  StepDefinition,
  TechStack,
  Workflow,
  WorkflowStep,
} from '../src/index.js';

// Compile-time absence checks (AC-024): each removed type name must fail to resolve from the root.
// A name that comes back makes its @ts-expect-error unused, and tsc over test/ then fails.
// @ts-expect-error F-07 AC-024: StepScope is removed from the root
import type { StepScope } from '../src/index.js';
// @ts-expect-error F-07 AC-024: PlaceholderValues is removed from the root
import type { PlaceholderValues } from '../src/index.js';
// @ts-expect-error F-07 AC-024: TemplateContext is removed from the root
import type { TemplateContext } from '../src/index.js';
// @ts-expect-error F-07 AC-024: GenerationPlanEntry is removed from the root
import type { GenerationPlanEntry } from '../src/index.js';
// @ts-expect-error F-07 AC-024: GenerationPlan is removed from the root
import type { GenerationPlan } from '../src/index.js';

const FLAT_ANALYSIS_NAMES = ['analyzeStructure', 'skippedAnalysis', 'checkReview'] as const;
const FLAT_ANALYSIS_DIR = join(import.meta.dirname, '..', 'src', 'analyze');

/** Flat generator, plan, reply check and file list names removed by F-07 (AC-024). */
const REMOVED_GENERATOR_NAMES = [
  'generate',
  'planGeneration',
  'checkReply',
  'validateConfig',
  'finishFileList',
  'BASE_FILES',
  'pathProblem',
] as const;

/** Flat render names removed by F-07 T015 and T021 (AC-024). */
const REMOVED_RENDER_NAMES = [
  'renderConditionals',
  'checkNoStrayMarkers',
  'renderPlaceholders',
  'projectValues',
  'renderTemplate',
  'stepFilePath',
  'workflowFilePath',
  'renderRules',
  'renderStepFiles',
  'renderWorkflowCommand',
  'WORKFLOW_TEMPLATE',
  'scopeText',
  'stepsText',
  'renderMermaid',
  'mermaidId',
] as const;

/** Flat validate names removed by F-07 T015 (AC-024). */
const REMOVED_VALIDATE_NAMES = [
  'checkDuplicateIds',
  'assertValidConfig',
  'checkMap',
  'checkPolicy',
  'checkRoutes',
  'GATE_TYPES',
  'REQUIRED_WORKFLOW_IDS',
] as const;

/** Root value exports the web app imports from @sddbuilder/core, value imports in src and test (AC-025). */
const WEB_VALUE_NAMES = [
  'INPUT_CAPS',
  'parseProjectConfig',
  'DEFAULT_STEP_CATALOG',
  'DEFAULT_WORKFLOWS',
  'DEFAULT_CONNECTIONS',
  'getCatalogStep',
  'wouldCreateCycle',
  'selectConditions',
] as const;

const REMOVED_VALUE_NAMES = [
  ...REMOVED_GENERATOR_NAMES,
  ...REMOVED_RENDER_NAMES,
  ...REMOVED_VALIDATE_NAMES,
] as const;

/** Type-only names the web app imports; a compile-time check that they still resolve from the root (AC-025). */
type WebTypeExports = readonly [
  AnalysisFinding,
  AnalysisResult,
  AnalysisReview,
  Condition,
  ConfigProblem,
  Gate,
  GateType,
  MapConnection,
  ModuleSpec,
  ProjectConfig,
  RouteTarget,
  Scope,
  StepDefinition,
  TechStack,
  Workflow,
  WorkflowStep,
];

function hasRootExport(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(root, name);
}

describe('F-04 AC-024: the root no longer exports the flat analysis', () => {
  it.each(FLAT_ANALYSIS_NAMES)('F-04 AC-024 the root namespace has no %s', (name) => {
    expect(root).not.toHaveProperty(name);
  });

  it('F-04 AC-024 no flat analysis folder remains under src/analyze', () => {
    expect(existsSync(FLAT_ANALYSIS_DIR)).toBe(false);
  });

  it.each(FLAT_ANALYSIS_NAMES)('F-04 AC-024 the pipeline namespace still has %s', (name) => {
    expect(root.pipeline).toHaveProperty(name);
  });
});

describe('F-07 AC-024: the root names no removed flat export', () => {
  it.each(REMOVED_VALUE_NAMES)('F-07 AC-024 the root has no own export %s', (name) => {
    expect(hasRootExport(name)).toBe(false);
  });

  it('F-07 AC-024 the pipeline namespace keeps its parser and generator after the flat removal', () => {
    expect(typeof root.pipeline.parsePipelineConfig).toBe('function');
    expect(typeof root.pipeline.generate).toBe('function');
  });
});

describe('F-07 AC-025: the root still exports what the web app imports', () => {
  it.each(WEB_VALUE_NAMES)('F-07 AC-025 the root exports %s', (name) => {
    expect(hasRootExport(name)).toBe(true);
  });

  it('F-07 AC-025 parseProjectConfig and wouldCreateCycle are functions', () => {
    expect(typeof root.parseProjectConfig).toBe('function');
    expect(typeof root.wouldCreateCycle).toBe('function');
  });

  it('F-07 AC-025 selectConditions and getCatalogStep are functions', () => {
    expect(typeof root.selectConditions).toBe('function');
    expect(typeof root.getCatalogStep).toBe('function');
  });

  it('F-07 AC-025 INPUT_CAPS, the default catalog and the default map are present', () => {
    expect(root.INPUT_CAPS).toBeDefined();
    expect(root.DEFAULT_STEP_CATALOG.length).toBeGreaterThan(0);
    expect(root.DEFAULT_WORKFLOWS.length).toBeGreaterThan(0);
    expect(root.DEFAULT_CONNECTIONS.length).toBeGreaterThan(0);
  });

});
