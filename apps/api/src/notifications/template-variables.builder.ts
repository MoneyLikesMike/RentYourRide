export type PinpointSubstitutions = Record<string, string[]>;

export class TemplateVariablesBuilder {
  private variables: PinpointSubstitutions = {};

  init(): TemplateVariablesBuilder {
    return new TemplateVariablesBuilder();
  }

  setVariable(key: string, value: string): this {
    this.variables[key] = [value];
    return this;
  }

  setNumberVariable(key: string, value: number): this {
    this.variables[key] = [String(value)];
    return this;
  }

  setMoneyVariable(key: string, dollars: number): this {
    this.variables[key] = [`$${dollars}`];
    return this;
  }

  mergeWith(map: PinpointSubstitutions): this {
    this.variables = { ...this.variables, ...map };
    return this;
  }

  build(): PinpointSubstitutions {
    return this.variables;
  }
}
