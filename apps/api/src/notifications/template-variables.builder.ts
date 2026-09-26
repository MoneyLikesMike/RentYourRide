export type PinpointSubstitutions = Record<string, string[]>;

/** Strip Handlebars delimiters so substitution values cannot break template rendering. */
function sanitizeSubstitution(value: string): string {
  return value.replace(/\{\{/g, '').replace(/\}\}/g, '');
}

export class TemplateVariablesBuilder {
  private variables: PinpointSubstitutions = {};

  init(): TemplateVariablesBuilder {
    return new TemplateVariablesBuilder();
  }

  setVariable(key: string, value: string): this {
    this.variables[key] = [sanitizeSubstitution(value ?? '')];
    return this;
  }

  setNumberVariable(key: string, value: number): this {
    this.variables[key] = [String(value)];
    return this;
  }

  setMoneyVariable(key: string, dollars: number): this {
    const n = Number.isFinite(dollars) ? dollars : 0;
    this.variables[key] = [`$${n.toFixed(2)}`];
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
