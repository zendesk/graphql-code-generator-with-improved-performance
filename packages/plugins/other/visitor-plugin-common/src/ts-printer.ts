export type PrimitiveString =
  | 'string'
  | 'number'
  | 'boolean'
  | 'any'
  | 'null'
  | 'undefined'
  | 'void'
  | 'never'
  | 'unknown'
  | 'object'
  | 'symbol'
  | 'bigint'
  | 'this'
  | 'object'
  | 'function'
  | 'true'
  | 'false';

export type TypeScriptValue =
  | TypeScriptPrimitive
  | TypeScriptStringLiteral
  | TypeScriptObject
  | TypeScriptEnum
  | TypeScriptUnion
  | TypeScriptIntersection
  | TypeScriptTypeAlias
  | TypeScriptInterface;

export type Statement = TypeScriptInterface | TypeScriptTypeAlias | TypeScriptEnum;

abstract class TypeScriptPrintable {
  abstract print(indentation?: number): string;
}

class TypeScriptCommentable {
  comment?: string;

  withComment(comment: string): this {
    this.comment = comment;
    return this;
  }

  printComment(indentation = 0): string {
    if (!this.comment) return '';
    const indent = ' '.repeat(indentation);
    const commentLines = this.comment.split('\n');
    return commentLines.length === 1
      ? `${indent}/** ${this.comment} */\n`
      : `${indent}/**\n${commentLines.map(line => `${indent} * ${line}`).join('\n')}\n${indent} */\n`;
  }
}

export class TypeScriptPrimitive implements TypeScriptPrintable {
  public primitive: PrimitiveString;

  constructor({ primitive }: { primitive: PrimitiveString }) {
    this.primitive = primitive;
  }
  print(): string {
    return this.primitive;
  }
}

export class TypeScriptStringLiteral implements TypeScriptPrintable {
  public literal: string;

  constructor({ literal }: { literal: string }) {
    this.literal = literal;
  }
  print(): string {
    return `'${this.literal}'`;
  }
}

export const TypeScriptPrimitiveString = new TypeScriptPrimitive({ primitive: 'string' });
export const TypeScriptPrimitiveNumber = new TypeScriptPrimitive({ primitive: 'number' });
export const TypeScriptPrimitiveBoolean = new TypeScriptPrimitive({ primitive: 'boolean' });
export const TypeScriptPrimitiveAny = new TypeScriptPrimitive({ primitive: 'any' });
export const TypeScriptPrimitiveNull = new TypeScriptPrimitive({ primitive: 'null' });
export const TypeScriptPrimitiveUndefined = new TypeScriptPrimitive({ primitive: 'undefined' });
export const TypeScriptPrimitiveVoid = new TypeScriptPrimitive({ primitive: 'void' });
export const TypeScriptPrimitiveNever = new TypeScriptPrimitive({ primitive: 'never' });
export const TypeScriptPrimitiveUnknown = new TypeScriptPrimitive({ primitive: 'unknown' });
export const TypeScriptPrimitiveObject = new TypeScriptPrimitive({ primitive: 'object' });
export const TypeScriptPrimitiveSymbol = new TypeScriptPrimitive({ primitive: 'symbol' });
export const TypeScriptPrimitiveBigInt = new TypeScriptPrimitive({ primitive: 'bigint' });
export const TypeScriptPrimitiveThis = new TypeScriptPrimitive({ primitive: 'this' });
export const TypeScriptPrimitiveFunction = new TypeScriptPrimitive({ primitive: 'function' });
export const TypeScriptPrimitiveTrue = new TypeScriptPrimitive({ primitive: 'true' });
export const TypeScriptPrimitiveFalse = new TypeScriptPrimitive({ primitive: 'false' });

export class TypeScriptEnum extends TypeScriptCommentable implements TypeScriptPrintable {
  typeName: string;
  entries: { name: string; value?: string }[];
  export?: boolean;

  constructor({
    typeName,
    entries,
    ...rest
  }: {
    typeName: string;
    entries: { name: string; value?: string }[];
    export?: boolean;
  }) {
    super();
    this.typeName = typeName;
    this.entries = entries;
    this.export = rest.export;
  }

  addEntry(entry: { name: string; value?: string }): TypeScriptEnum {
    this.entries.push(entry);
    return this;
  }

  print(indentation = 0): string {
    const indent = ' '.repeat(indentation);
    const indentEnumValue = ' '.repeat(indentation + 2);
    return `${this.printComment(indentation)}${indent}${this.export ? `export ` : ''}enum ${
      this.typeName
    } {\n${this.entries
      .map(e => `${indentEnumValue}${e.name}${e.value ? ` = ${e.value}` : ''}`)
      .join(`,\n`)}\n${indent}}`;
  }
}

export class TypeScriptObjectProperty extends TypeScriptCommentable implements TypeScriptPrintable {
  propertyName: string;
  value: TypeScriptValue;

  constructor({ propertyName, value }: { propertyName: string; value: TypeScriptValue }) {
    super();
    this.propertyName = propertyName;
    this.value = value;
  }

  print(indentation = 0): string {
    const indent = ' '.repeat(indentation);
    return `${this.printComment(indentation)}${indent}${this.propertyName}: ${
      'typeName' in this.value ? this.value.typeName : this.value.print(indentation)
    }`;
  }
}

export class TypeScriptObject implements TypeScriptPrintable {
  properties: TypeScriptObjectProperty[];
  constructor({ properties }: { properties: TypeScriptObjectProperty[] }) {
    this.properties = properties;
  }
  addProperty(property: TypeScriptObjectProperty) {
    this.properties.push(property);
    return this;
  }
  print(indentation = 0): string {
    const indent = ' '.repeat(indentation);
    return `{\n${this.properties.map(p => p.print(indentation + 2)).join(`,\n`)}\n${indent}}`;
  }
}

function flattenProperties(m: TypeScriptValue): (TypeScriptObjectProperty | false)[] {
  if (m instanceof TypeScriptObject) {
    return m.properties;
  }
  if (m instanceof TypeScriptIntersection) {
    return m.members.flatMap(flattenProperties);
  }
  return [false];
}

export class TypeScriptIntersection implements TypeScriptPrintable {
  members: TypeScriptValue[];
  constructor({ members }: { members: TypeScriptValue[] }) {
    this.members = members;
  }
  addMember(member: TypeScriptValue) {
    this.members.push(member);
    return this;
  }

  print(indentation = 0): string {
    const flattenedProperties = this.members.flatMap(flattenProperties);
    if (flattenedProperties.every(m => m !== false)) {
      return this.printOptimizedIntersection(flattenedProperties as TypeScriptObjectProperty[], indentation);
    }

    return this.members
      .map(m => (m instanceof TypeScriptUnion ? `( ${m.print(indentation)} )` : m.print(indentation)))
      .join(' & ');
  }

  /**
   * Instead of printing multiple intersections of objects,
   * we can flatten their properties and merge them into a single object.
   */
  private printOptimizedIntersection(flattenedProperties: TypeScriptObjectProperty[], indentation: number) {
    const properties: { [key: string]: TypeScriptValue[] } = {};
    for (const p of flattenedProperties) {
      if (properties[p.propertyName]) {
        properties[p.propertyName].push(p.value);
      } else {
        properties[p.propertyName] = [p.value];
      }
    }

    const newObject = new TypeScriptObject({
      properties: Object.entries(properties).map(([propertyName, values]) => {
        return new TypeScriptObjectProperty({
          propertyName,
          value: values.length > 1 ? new TypeScriptIntersection({ members: values }) : values[0],
        });
      }),
    });

    return newObject.print(indentation);
  }
}

export class TypeScriptUnion implements TypeScriptPrintable {
  members: TypeScriptValue[];
  constructor({ members }: { members: TypeScriptValue[] }) {
    this.members = members;
  }
  addMember(member: TypeScriptValue) {
    this.members.push(member);
    return this;
  }
  print(indentation = 0): string {
    return this.members
      .map(m => (m instanceof TypeScriptIntersection ? `( ${m.print(indentation)} )` : m.print(indentation)))
      .join(' | ');
  }
}

export class TypeScriptInterface extends TypeScriptCommentable implements TypeScriptPrintable {
  typeName: string;
  extends: TypeScriptInterface[];
  definition: TypeScriptObject;
  export?: boolean;

  constructor(data: {
    typeName: string;
    extends?: TypeScriptInterface[];
    definition?: TypeScriptObject;
    export?: boolean;
  }) {
    super();
    this.typeName = data.typeName;
    this.extends = data.extends ?? [];
    this.definition = data.definition ?? new TypeScriptObject({ properties: [] });
    this.export = data.export;
  }

  addExtend(extend: TypeScriptInterface) {
    this.extends.push(extend);
    return this;
  }

  print(indentation = 0): string {
    const indent = ' '.repeat(indentation);
    return `${this.printComment(indentation)}${indent}${this.export ? `export ` : ''}interface ${this.typeName}${
      this.extends.length > 0 ? ` extends ${this.extends.map(value => value.typeName).join(', ')}` : ''
    } ${this.definition.print(indentation)}`;
  }
}

export class TypeScriptTypeAlias extends TypeScriptCommentable implements TypeScriptPrintable {
  typeName: string;
  target: TypeScriptValue;
  export?: boolean;

  constructor({ typeName, target, ...rest }: { typeName: string; target: TypeScriptValue; export?: boolean }) {
    super();
    this.typeName = typeName;
    this.target = target;
    this.export = rest.export;
  }

  print(indentation = 0): string {
    const indent = ' '.repeat(indentation);
    return `${this.printComment(indentation)}${indent}${this.export ? `export ` : ''}type ${
      this.typeName
    } = ${this.target.print(indentation)}`;
  }
}

export class TypeScriptPrinter implements TypeScriptPrintable {
  statements: Statement[];

  constructor({ statements }: { statements: Statement[] }) {
    this.statements = statements;
  }

  addStatement(statement: Statement) {
    this.statements.push(statement);
    return this;
  }

  print(indentation = 0): string {
    return this.statements.map(s => s.print(indentation)).join('\n\n');
  }
}
