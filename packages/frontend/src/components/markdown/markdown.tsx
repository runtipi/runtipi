import clsx from 'clsx';
import type React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

export const Markdown: React.FC<{ content: string; className: string }> = ({ content, className }) => (
  <ReactMarkdown className={clsx('markdown', className)} remarkPlugins={[remarkBreaks, remarkGfm]} rehypePlugins={[rehypeRaw]}>
    {content}
  </ReactMarkdown>
);
