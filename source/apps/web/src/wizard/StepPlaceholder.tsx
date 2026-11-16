interface StepPlaceholderProps {
  /** The feature that builds this step's body (F-21 for step 2, F-22 for step 4). */
  feature: 'F-21' | 'F-22';
}

/** The body of a step that another feature builds. The frame and its navigation are complete (F-05 AC-001). */
export function StepPlaceholder({ feature }: StepPlaceholderProps) {
  return <p className="hint">This step is built by {feature}.</p>;
}
