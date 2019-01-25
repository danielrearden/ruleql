# RuleQL

⚠️ **This project is experimental and under active development. Use in production at your own risk.**

**RuleQL** is a rule engine that employs rules written in GraphQL-like syntax.

## Getting Started

### Installing

```
yarn install ruleql
```

### A simple example

A `RuleEngine` instance can be initialized using the default configuration, which will utilize the default set of conditions and effects. 

```
import RuleEngine from 'ruleql'

const ruleEngine = new RuleEngine()
```

A rule consists of `effects` and `conditions`, both of which are written using GraphQL-like syntax.

```
const rules = [
  {
    conditions: '{ greaterThanOrEqual(path: "gradeAverage", value: 95) }'
    effects: '{ set(path: "giveGoldStar", value: "true") }'
  },
  {
    conditions: '{ lessThan(path: "gradeAverage", value: 50) }'
    effects: '{ set(path: "recommendTutoring", value: "true") }'
  },
]
```

Rules are passed to the `RuleEngine`'s `processRules` method along with a context object. The default set of conditions read the context, while the default set of effects mutate the context.

```
const context = {
  graveAverage: 97,
}

ruleEngine.processRules(rules, context).then(() => {
  console.log(context.giveGoldStar) // true
  console.log(context.recommendTutoring) // undefined
})
```

The default sets of conditions and effects are documented in their respective files, which can be found [here](src/conditions/conditions.ts) and [here](src/effects/effects.ts).

## Configuration

### Custom conditions and effects

The default conditions and effects may not be suitable for your project's needs, particularly if you need to fetch or mutate data asynchronously. Custom fields can be passed in for both effects and conditions when create a new `RuleEngine` instance.

```
const conditionFields = `
  isStarPupil(id: String!): Boolean!
`
const conditionResolvers = {
  isStarPupil: async (args, context) => {
    const student = await Student.getById(args.id)
    return student.gradeAverage >= 95
  }
}
const conditionFields = `
  isStarPupil: Boolean!
`
const conditionResolvers = {
  isStarPupil: async (args, context) => {
    const student = await Student.getById(context.studentId)
    return student.gradeAverage >= 95
  }
}
const effectFields = `
  giveGoldStar: Void
`
const effectResolvers = {
  isStarPupil: async (args, context) => {
    const student = await Student.getById(context.studentId)
    await student.giveGoldStar()
  }
}
const ruleEngine = new RuleEngine({
  conditionFields,
  conditionResolvers,
  effectFields,
  effectResolvers,
})
```

Once configured in this way, the `RuleEngine` can then validate and process rules that include these fields. Note: condition fields should always have a type of `Boolean` and effect fields should always have a type of `Void`.

```
ruleEngine.processRules([{
  conditions: `{ isStarPupil }`,
  effects: `{ giveGoldStar }`,
}])
```

### Custom input types

A rule engine may also be configured with optional `conditionTypeDefs` and `effectTypeDefs`. These fields provide a way for you to define custom input types that can then be used in your custom fields' arguments.

```
const effectTypeDefs = `
  input StudentInput {
    year: Int!
    major: String!
  }
`
const effectFields = `
  createStudent(input: StudentInput!)
`
```

## Rule Processing

### Condition evaluation and effect resolution

Rule conditions are evaluated before any effects are executed, so the effects of a rule will not impact the condition evaluation of another rule. Rule effects themselves are evaluated in the same order as their respective rules.

### Logical operators

Conditions can be combined using four logical operators:

* `and` - evaluates true if all fields evaluate to true
* `or` - evaluates true if at least one field evaluates to true
* `xor` - evaluates true if exactly one of the fields evaluates to true
* `not` - evaluates the opposite of the child field

```
{
  not {
    or {
      always
      never
    }
  }
}
```

If multiple fields are provided at the root of the query, or as the selection set of a `not` field, they will be treated as if they were wrapped in an `and` first.

### Rule Sets

The array of rules passed to `processRules` can include nested arrays. Rules passed in as an array are treated as a set, where only the first rule whose conditions evaluate as true will have its effects executed. Grouping rules like this allows you to have rules that are mutually exclusive.

```
ruleEngine.processRules([rule1, [rule2, rule3]], context)
```

## Contributing

This library is under active development. I'd love for folks to try it out and provide feedback [here](https://github.com/danielrearden/ruleql/issues/new).

## Roadmap

The following features may be added in the near future

☐ Allow engine to be configured with different rule processing strategies  
☐ Expand the default sets of conditions and effects to accommodate more common use cases  

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
