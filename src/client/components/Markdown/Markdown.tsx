import clsx from 'clsx';
import type React from 'react';
import ReactMarkdown from 'react-markdown';
import type { PluggableList } from 'react-markdown/lib';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

export const Markdown: React.FC<{ children: string; className: string }> = ({ children, className }) => (
  <ReactMarkdown className={clsx('markdown', className)} remarkPlugins={[remarkBreaks, remarkGfm]} rehypePlugins={[rehypeRaw] as PluggableList}>
    {children}
  </ReactMarkdown>
);
