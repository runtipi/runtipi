import type React from 'react';

// Creates a union type of string literals with strings, but retains intellisense for the literals.
// Union<string, 'foo' | 'bar'> => string | Omit<string, 'foo' | 'bar'>
type Union<S = string, T extends string | number = string> = T | Omit<S, T>;

const breakpoints = ['initial', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
type Breakpoint = (typeof breakpoints)[number];
type Responsive<T> = T | Partial<Record<Breakpoint, T>>;

type BooleanPropDef = {
  type: 'boolean';
  default?: boolean;
  required?: boolean;
  className?: string;
};
type StringPropDef = {
  type: 'string';
  default?: string;
  required?: boolean;
};
type ReactNodePropDef = {
  type: 'ReactNode';
  default?: React.ReactNode;
  required?: boolean;
};
type EnumPropDef<T> = {
  type: 'enum';
  values: readonly T[];
  default?: T;
  required?: boolean;
};
type EnumOrStringPropDef<T> = {
  type: 'enum | string';
  values: readonly T[];
  default?: T | string;
  required?: boolean;
};

type NonStylingPropDef = {
  className?: never;
  customProperties?: never;
  parseValue?: never;
};

type StylingPropDef = {
  className: string;
  parseValue?: (value: string) => string | undefined;
};

type ArbitraryStylingPropDef = {
  className: string;
  customProperties: `--${string}`[];
  parseValue?: (value: string) => string | undefined;
};

type RegularPropDef<T> =
  | ReactNodePropDef
  | BooleanPropDef
  | (StringPropDef & ArbitraryStylingPropDef)
  | (StringPropDef & NonStylingPropDef)
  | (EnumPropDef<T> & StylingPropDef)
  | (EnumPropDef<T> & NonStylingPropDef)
  | (EnumOrStringPropDef<T> & ArbitraryStylingPropDef)
  | (EnumOrStringPropDef<T> & NonStylingPropDef);
// biome-ignore lint/suspicious/noExplicitAny: Reasoning: This is a utility type that is used to infer the `as` prop of a component.
type ResponsivePropDef<T = any> = RegularPropDef<T> & { responsive: true };
// biome-ignore lint/suspicious/noExplicitAny: Reasoning: This is a utility type that is used to infer the `as` prop of a component.
type PropDef<T = any> = RegularPropDef<T> | ResponsivePropDef<T>;

// prettier-ignore
type GetPropDefType<Def> = Def extends BooleanPropDef
  ? Def extends ResponsivePropDef
    ? Responsive<boolean>
    : boolean
  : Def extends StringPropDef
    ? Def extends ResponsivePropDef
      ? Responsive<string>
      : string
    : Def extends ReactNodePropDef
      ? Def extends ResponsivePropDef
        ? Responsive<React.ReactNode>
        : React.ReactNode
      : Def extends EnumOrStringPropDef<infer Type>
        ? Def extends ResponsivePropDef<infer Type extends string>
          ? Responsive<Union<string, Type>>
          : Type
        : Def extends EnumPropDef<infer Type>
          ? Def extends ResponsivePropDef<infer Type>
            ? Responsive<Type>
            : Type
          : never;

type GetPropDefTypes<P> = {
  [K in keyof P]?: GetPropDefType<P[K]>;
};

export { breakpoints };
export type {
  PropDef,
  GetPropDefTypes,
  ResponsivePropDef,
  //
  Breakpoint,
  Responsive,
  Union,
};
