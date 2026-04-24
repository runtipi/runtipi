import clsx from 'clsx';
import type React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

export const Markdown: React.FC<{ content: string; className: string }> = ({ content, className }) => (
  <div className={clsx('markdown', className)}>
    <ReactMarkdown remarkPlugins={[remarkBreaks, remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
      {content}
    </ReactMarkdown>
  </div>
);
