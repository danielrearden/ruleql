import ConditionExecutor from '../condition-executor'

async function assertExecute (expected: boolean, conditions: string): Promise<void> {
  const executor = new ConditionExecutor()
  const rule = { conditions, effects: '' }
  const result = await executor.executeAll([rule], {})
  expect(result).toEqual([expected])
}

describe('ConditionExecutor', () => {
  describe('executeAll', () => {
    it('should execute AND conditions correctly', async () => {
      await assertExecute(true, `{
        and {
          always
          always
        }
      }`)

      await assertExecute(false, `{
        and {
          always
          never
        }
      }`)

      await assertExecute(false, `{
        and {
          never
          never
        }
      }`)
    })

    it('should execute OR conditions correctly', async () => {
      await assertExecute(true, `{
        or {
          always
          always
        }
      }`)

      await assertExecute(true, `{
        or {
          always
          never
        }
      }`)

      await assertExecute(false, `{
        or {
          never
          never
        }
      }`)
    })

    it('should execute XOR conditions correctly', async () => {
      await assertExecute(false, `{
        xor {
          always
          always
        }
      }`)

      await assertExecute(true, `{
        xor {
          always
          never
        }
      }`)

      await assertExecute(false, `{
        xor {
          never
          never
        }
      }`)
    })

    it('should execute XOR conditions correctly', async () => {
      await assertExecute(true, `{
        not {
          never
        }
      }`)

      await assertExecute(false, `{
        not {
          always
        }
      }`)

      await assertExecute(true, `{
        not {
          and {
            always
            never
          }
        }
      }`)

      await assertExecute(true, `{
        not {
          always
          never
        }
      }`)
    })

    it('should fallback to AND logic if AND, OR, XOR or NOT are not present', async () => {
      await assertExecute(false, `{
        always
        never
      }`)

      await assertExecute(true, `{
        always
        always
      }`)
    })

    it('should read condition validation results from cache if they exist', async () => {
      const fields = `
        someCondition: Boolean!
      `
      const resolvers = {
        someCondition: jest.fn(() => {
          return Promise.resolve(true)
        }),
      }
      const executor = new ConditionExecutor({ fields, resolvers })
      const conditions = `{
        or {
          someCondition
          and {
            someCondition
            someCondition
          }
        }
      }`
      const rule = { conditions, effects: '' }
      await executor.executeAll([rule], {})
      expect(resolvers.someCondition).toBeCalledTimes(1)
    })

    it('should execute multiple sets of conditions', async () => {
      const executor = new ConditionExecutor()
      const rules = [
        {
          conditions: `{
            and {
              always
              never
            }
          }`,
          effects: '',
        },
        {
          conditions: `{
            or {
              always
              never
            }
          }`,
          effects: '',
        },
      ]
      const result = await executor.executeAll(rules, {})
      expect(result).toEqual([false, true])
    })
  })
})
