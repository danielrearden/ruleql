import EffectExecutor from '../effect-executor'

describe('ConditionExecutor', () => {
  describe('execute', () => {
    it('should mutate the context', async () => {
      const executor = new EffectExecutor()
      const context = { count: 0 }
      const effects = `{
        add(path: "count", value: 7)
      }`
      await executor.executeAll([effects], context)
      expect(context).toHaveProperty('count', 7)
    })
  })

  describe('executeAll', () => {
    it('should execute multiple sets of effects sequentially', async () => {
      const executor = new EffectExecutor()
      const context = { count: 7 }
      const effectSet = [
        `{
          add(path: "count", value: 4)
        }`,
        `{
          multiply(path: "count", value: 3)
        }`,
      ]
      await executor.executeAll(effectSet, context)
      expect(context).toHaveProperty('count', 33)
    })
  })
})
