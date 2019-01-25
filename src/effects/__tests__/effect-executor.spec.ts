import EffectExecutor from '../effect-executor'

describe('ConditionExecutor', () => {
  describe('execute', () => {
    it('should mutate the context', async () => {
      const executor = new EffectExecutor()
      const context = { count: 0 }
      const effects = `{
        add(path: "count", value: 7)
      }`
      const rule = { effects, conditions: '' }
      await executor.executeAll([rule], context)
      expect(context).toHaveProperty('count', 7)
    })
  })

  describe('executeAll', () => {
    it('should execute multiple sets of effects sequentially', async () => {
      const executor = new EffectExecutor()
      const context = { count: 7 }
      const rules = [
        {
          conditions: '',
          effects: `{
            add(path: "count", value: 4)
          }`,
        },
        {
          conditions: '',
          effects: `{
            multiply(path: "count", value: 3)
          }`,
        },
      ]
      await executor.executeAll(rules, context)
      expect(context).toHaveProperty('count', 33)
    })
  })

  describe('context', () => {
    it('should have access to rule data in execution context', async () => {
      const executor = new EffectExecutor()
      const context = {}
      const rules = [
        {
          bar: 'BAR',
          conditions: '',
          effects: `{
            concat(path: "foo", valuePath: "rule.bar")
          }`,
        },
      ]
      await executor.executeAll(rules, context)
      expect(context).toHaveProperty('foo', ['BAR'])
    })
  })
})
