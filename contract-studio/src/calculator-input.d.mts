export type CalculatorMode = 'expression' | 'sum' | 'calculator' | 'average';
export function prepareCalculatorRequest(mode: CalculatorMode, expression: string): {
  path: string;
  body: Record<string, unknown>;
};
export function normalizeCalculatorResult(mode: CalculatorMode, run: unknown): unknown;
