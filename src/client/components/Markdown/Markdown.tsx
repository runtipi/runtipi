import clsx from 'clsx';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { PluggableList } from 'react-markdown/lib';

export const Markdown: React.FC<{ children: string; className: string }> = ({ children, className }) => (
  <ReactMarkdown className={clsx('markdown', className)} remarkPlugins={[remarkBreaks, remarkGfm]} rehypePlugins={[rehypeRaw] as PluggableList}>
    {children}
  </ReactMarkdown>
);
