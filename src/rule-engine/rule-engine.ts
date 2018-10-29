import * as _ from 'lodash'

import { ConditionResolverMap, ConditionValidator } from '../conditions'
import { EffectsResolverMap, EffectExecutor } from '../effects'
import { getPathMap } from '../utils'

export interface Rule {
  conditions: string,
  effects: string,
}

export interface RuleArray extends Array<Rule | Rule[] | RuleArray> {}

export interface RuleEngineConfig {
  conditionFields?: string,
  conditionTypeDefs?: string,
  conditionResolvers?: ConditionResolverMap,
  effectFields?: string,
  effectTypeDefs?: string,
  effectResolvers?: EffectsResolverMap,
}

export default class RuleEngine {
  public conditionValidator: ConditionValidator = null
  public effectExecutor: EffectExecutor = null

  constructor (config: RuleEngineConfig = {}) {
    const {
      conditionFields,
      conditionTypeDefs,
      conditionResolvers,
      effectFields,
      effectTypeDefs,
      effectResolvers,
    } = config
    this.conditionValidator = new ConditionValidator({
      additionalTypeDefs: conditionTypeDefs,
      fields: conditionFields,
      resolvers: conditionResolvers,
    })
    this.effectExecutor = new EffectExecutor({
      additionalTypeDefs: effectTypeDefs,
      fields: effectFields,
      resolvers: effectResolvers,
    })
  }

  public async processRules (rules: RuleArray, context: {}): Promise<void> {
    // Grab all the rules and evaluate their conditions in parallel
    const ruleConditions = _.flattenDeep(rules).map((rule) => (rule as Rule).conditions)
    const conditionValidationResults = await this.conditionValidator.executeAll(ruleConditions, context)

    const effectsToExecute = []
    const evaluatedRuleSets = []
    const rulePaths = Object.keys(getPathMap(rules))
    rulePaths.forEach((rulePath, index) => {
      const conditionsEvaluatedTrue = conditionValidationResults[index]
      const split = rulePath.split('[')
      const isPartOfRuleSet = split.length > 1
      const ruleIndex = split[0]

      // If a rule's conditions are true, we only execute the corresponding effects if either
      // the rule is not part of any rule set, or its the first rule in a rule set whose conditions evaluate true
      if (conditionsEvaluatedTrue && (!isPartOfRuleSet || !evaluatedRuleSets.includes(ruleIndex))) {
        const rule = _.get(rules, rulePath)
        effectsToExecute.push(rule.effects)
        if (isPartOfRuleSet) {
          evaluatedRuleSets.push(ruleIndex)
        }
      }
    })
    await this.effectExecutor.executeAll(effectsToExecute, context)
  }
}
