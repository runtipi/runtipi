import clsx from 'clsx';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { PluggableList } from 'react-markdown/lib/react-markdown';

const MarkdownImg = (props: Pick<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'key' | keyof React.ImgHTMLAttributes<HTMLImageElement>>) => (
  <div className="d-flex justify-content-center">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img alt="app-demonstration" {...props} />
  </div>
);

const Markdown: React.FC<{ children: string; className: string }> = ({ children, className }) => (
  <ReactMarkdown
    className={clsx('markdown', className)}
    components={{
      // h2: (props) => <h2 {...props} className="text-xl font-bold mb-4 text-center md:text-left" />,
      // h3: (props) => <h3 {...props} className="text-lg font-bold mb-4 text-center md:text-left" />,
      // ul: (props) => <ul {...props} className="list-disc pl-4 mb-4" />,
      img: MarkdownImg,
      // p: (props) => <p {...props} className="mb-4 text-left md:text-left" />,
      // a: (props) => <a target="_blank" rel="noreferrer" {...props} className="text-blue-500" href={props.href} />,
      // div: (props) => <div {...props} className="mb-4" />,
    }}
    remarkPlugins={[remarkBreaks, remarkGfm]}
    rehypePlugins={[rehypeRaw] as PluggableList}
  >
    {children}
  </ReactMarkdown>
);

export default Markdown;
