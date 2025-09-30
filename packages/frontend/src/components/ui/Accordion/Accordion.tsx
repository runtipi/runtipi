/** biome-ignore-all lint/a11y/noSvgWithoutTitle: <explanation>SVG is decorative</explanation> */
import type React from 'react';
import { createContext, useContext } from 'react';

/**
 * Minimal className joiner (no external deps)
 */
function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Contexts to share ids between root/item/parts
 */
type AccordionCtx = { rootId: string; multiple?: boolean };
const AccordionContext = createContext<AccordionCtx | null>(null);

type ItemCtx = { value: string; defaultOpen?: boolean };
const AccordionItemContext = createContext<ItemCtx | null>(null);

/**
 * Accordion (root)
 */
type AccordionProps = React.HTMLAttributes<HTMLDivElement> & {
  id: string;
  multiple?: boolean; // if false, behaves like single-open (uses data-bs-parent)
};

export function Accordion({ id, multiple, className, children, ...props }: AccordionProps) {
  return (
    <AccordionContext.Provider value={{ rootId: id, multiple }}>
      <div id={id} data-slot="accordion" className={cx('accordion accordion-tabs', className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

/**
 * AccordionItem
 */
type AccordionItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  defaultOpen?: boolean;
};

export function AccordionItem({ value, defaultOpen, className, children, ...props }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value, defaultOpen }}>
      <div data-slot="accordion-item" className={cx('accordion-item', className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

/**
 * AccordionTrigger
 * Renders:
 * <div class="accordion-header">
 *   <button class="accordion-button[ collapsed]" data-bs-toggle="collapse" ...>...</button>
 * </div>
 */
type AccordionTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  className?: string;
  hasError?: boolean;
};

export function AccordionTrigger({ className, hasError, children, ...props }: AccordionTriggerProps) {
  const root = useContext(AccordionContext);
  const item = useContext(AccordionItemContext);
  if (!root || !item) {
    throw new Error('AccordionTrigger must be used within <Accordion> and <AccordionItem>.');
  }

  const contentId = `${root.rootId}-${item.value}`;
  const triggerId = `${contentId}-trigger`;
  const isOpen = !!item.defaultOpen;

  return (
    <div className="accordion-header">
      <button
        type="button"
        id={triggerId}
        data-slot="accordion-trigger"
        className={cx('accordion-button', !isOpen && 'collapsed', hasError && 'border-danger text-danger', className)}
        data-bs-toggle="collapse"
        data-bs-target={`#${contentId}`}
        role="tab"
        aria-expanded={isOpen}
        aria-controls={contentId}
        {...props}
      >
        {children}
        <div className="accordion-button-toggle">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="icon icon-1"
          >
            <path d="M6 9l6 6l6 -6" />
          </svg>
        </div>
      </button>
    </div>
  );
}

/**
 * AccordionContent
 * Renders:
 * <div id="..." class="accordion-collapse collapse[ show]" data-bs-parent="#rootId">
 *   <div class="accordion-body [className]">children</div>
 * </div>
 */
type AccordionContentProps = React.HTMLAttributes<HTMLDivElement> & {
  className?: string; // applied to .accordion-body
  contentClassName?: string; // applied to the collapse container
};

export function AccordionContent({ className, contentClassName, children, ...props }: AccordionContentProps) {
  const root = useContext(AccordionContext);
  const item = useContext(AccordionItemContext);
  if (!root || !item) {
    throw new Error('AccordionContent must be used within <Accordion> and <AccordionItem>.');
  }

  const contentId = `${root.rootId}-${item.value}`;
  const triggerId = `${contentId}-trigger`;
  const isOpen = !!item.defaultOpen;

  return (
    <div
      id={contentId}
      data-slot="accordion-content"
      className={cx('accordion-collapse collapse', isOpen && 'show', contentClassName)}
      role="tabpanel"
      aria-labelledby={triggerId}
      {...(root.multiple ? {} : { 'data-bs-parent': `#${root.rootId}` })}
      {...props}
    >
      <div className={cx('accordion-body pt-0', className)}>{children}</div>
    </div>
  );
}
