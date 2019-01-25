export interface Rule {
  conditions: string,
  effects: string,
  [key: string]: any,
}

export interface RuleArray extends Array<Rule | Rule[] | RuleArray> {}

export interface ExecutionContext {
  [key: string]: any,
}
