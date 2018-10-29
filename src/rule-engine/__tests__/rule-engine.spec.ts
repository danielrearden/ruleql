import { Chance } from 'chance'
import RuleEngine, { RuleArray } from '../rule-engine'

const chance = new Chance()
const getInt = () => chance.integer({min: 1, max: 100})
const context = {
  bar: getInt(),
  foo: getInt(),
}
const always = `{
  always
}`
const never = `{
  never
}`
function add (n: number) {
  return `{
    add(path: "foo", value: ${n})
  }`
}
function multiply (n: number) {
  return `{
    multiply(path: "foo", value: ${n})
  }`
}

async function assertProcesses (rules, expected: object) {
  const ruleEngine = new RuleEngine()
  const ctx = Object.assign({}, context)
  await ruleEngine.processRules(rules, ctx)
  expect(ctx).toMatchObject(expected)
}

describe('RuleEngine', () => {
  describe('processRules', () => {
    it('should not have any effect if all conditions evaluate false', async () => {
      const n = getInt()
      const rules = [{ conditions: never, effects: add(n) }, { conditions: never, effects: multiply(n) }]
      await assertProcesses(rules, context)
    })

    it('should only execute effects for conditions that evaluate true', async () => {
      const a = getInt()
      const b = getInt()
      const rules = [
        { conditions: always, effects: add(a) },
        { conditions: always, effects: add(b) },
        { conditions: never, effects: multiply(a) },
      ]
      await assertProcesses(rules, { foo: a + b + context.foo })
    })

    it('should execute effects according the order of the rules', async () => {
      const a = getInt()
      const b = getInt()
      let rules = [
        { conditions: always, effects: add(a) },
        { conditions: always, effects: multiply(b) },
      ]

      await assertProcesses(rules, { foo: (context.foo + a) * b })
      rules = [
        { conditions: always, effects: multiply(b) },
        { conditions: always, effects: add(a) },
      ]
      await assertProcesses(rules, { foo: (context.foo * b) + a })
    })

    it('should execute effects for only the first rule in a ruleset whose conditions evaluate true', async () => {
      const a = getInt()
      const b = getInt()
      const c = getInt()
      const d = getInt()
      let rules: RuleArray = [[
        { conditions: never, effects: multiply(a) },
        { conditions: always, effects: add(a) },
        { conditions: always, effects: multiply(b) },
      ]]
      await assertProcesses(rules, { foo: context.foo + a })

      rules = [
        { conditions: never, effects: add(a) },
        { conditions: always, effects: add(b) },
        [
          { conditions: never, effects: multiply(a) },
          [
            { conditions: always, effects: add(c) },
            { conditions: always, effects: multiply(d) },
          ],
        ],
      ]
      await assertProcesses(rules, { foo: (context.foo + b) + c })
    })
  })
})
