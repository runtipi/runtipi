import clsx from 'clsx';

import { getResponsiveClassNames, getResponsiveStyles } from './get-responsive-styles.js';
import { isResponsiveObject } from './is-responsive-object.js';
import { mergeStyles } from './merge-styles.js';

import type * as React from 'react';
import type { PropDef } from '../props/prop-def.js';

type PropDefsWithClassName<T> = T extends Record<string, PropDef>
  ? { [K in keyof T]: T[K] extends { className: string } ? K : never }[keyof T]
  : never;

function mergePropDefs<T extends Record<string, PropDef>[]>(...args: T): Record<string, PropDef> {
  return Object.assign({}, ...args);
}

/**
 * Takes props, checks them against prop defs that have a `className` on them,
 * adds necessary CSS classes and inline styles, and returns the props without
 * the corresponding prop defs that were used to formulate the new `className`
 * and `style` values. Also applies prop def defaults to every prop.
 */

// biome-ignore lint/suspicious/noExplicitAny: Reasoning: This function is a utility function that is used to extract props from a component.
function extractProps<P extends { className?: string; style?: React.CSSProperties; [key: string]: any }, T extends Record<string, PropDef>[]>(
  props: P,
  ...propDefs: T
): Omit<P & { className?: string; style?: React.CSSProperties }, PropDefsWithClassName<T[number]>> {
  let className: string | undefined;
  let style: ReturnType<typeof mergeStyles>;
  const extractedProps = { ...props };
  const allPropDefs = mergePropDefs(...propDefs);

  for (const key in allPropDefs) {
    let value = extractedProps[key];
    const propDef = allPropDefs[key];

    // Apply prop def defaults
    if (propDef?.default !== undefined && value === undefined) {
      value = propDef.default;
    }

    // Apply the default value if the value is not a valid enum value
    if (propDef?.type === 'enum') {
      const values = [propDef.default, ...propDef.values];

      if (!values.includes(value) && !isResponsiveObject(value)) {
        value = propDef.default;
      }
    }

    // Apply the value with defaults
    // biome-ignore lint/suspicious/noExplicitAny: Reasoning: This is a utility function that is used to extract props from a component.
    (extractedProps as Record<string, any>)[key] = value;

    if (propDef && 'className' in propDef && propDef.className) {
      delete extractedProps[key];

      const isResponsivePropDef = 'responsive' in propDef;
      // Make sure we are not threading through responsive values for non-responsive prop defs
      if (!value || (isResponsiveObject(value) && !isResponsivePropDef)) {
        continue;
      }

      if (isResponsiveObject(value)) {
        // Apply prop def defaults to the `initial` breakpoint
        if (propDef.default !== undefined && value.initial === undefined) {
          value.initial = propDef.default;
        }

        // Apply the default value to the `initial` breakpoint when it is not a valid enum value
        if (propDef.type === 'enum') {
          const values = [propDef.default, ...propDef.values];

          if (!values.includes(value.initial)) {
            value.initial = propDef.default;
          }
        }
      }

      if (propDef.type === 'enum') {
        const propClassName = getResponsiveClassNames({
          allowArbitraryValues: false,
          value,
          className: propDef.className,
          propValues: propDef.values,
          parseValue: propDef.parseValue,
        });

        className = clsx(className, propClassName);
        continue;
      }

      if (propDef.type === 'string' || propDef.type === 'enum | string') {
        const propDefValues = propDef.type === 'string' ? [] : propDef.values;

        const [propClassNames, propCustomProperties] = getResponsiveStyles({
          className: propDef.className,
          customProperties: propDef.customProperties,
          propValues: propDefValues,
          parseValue: propDef.parseValue,
          value,
        });

        style = mergeStyles(style, propCustomProperties);
        className = clsx(className, propClassNames);
        continue;
      }

      if (propDef.type === 'boolean' && value) {
        // TODO handle responsive boolean props
        className = clsx(className, propDef.className);
      }
    }
  }

  extractedProps.className = clsx(className, props.className);
  extractedProps.style = mergeStyles(style, props.style);
  return extractedProps;
}

export { extractProps };
