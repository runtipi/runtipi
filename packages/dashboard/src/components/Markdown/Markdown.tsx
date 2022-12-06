import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';

const MarkdownImg = (props: Pick<React.DetailedHTMLProps<React.ImgHTMLAttributes<HTMLImageElement>, HTMLImageElement>, 'key' | keyof React.ImgHTMLAttributes<HTMLImageElement>>) => (
  <div className="d-flex justify-content-center">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img alt="app-demonstration" {...props} />
  </div>
);

const Markdown: React.FC<{ children: string; className: string }> = ({ children, className }) => (
  <ReactMarkdown
    className={className}
    components={{
      // h1: (props) => <h1 {...props} className="text-2xl font-bold mb-4 text-center md:text-left" />,
      // h2: (props) => <h2 {...props} className="text-xl font-bold mb-4 text-center md:text-left" />,
      // h3: (props) => <h3 {...props} className="text-lg font-bold mb-4 text-center md:text-left" />,
      // ul: (props) => <ul {...props} className="list-disc pl-4 mb-4" />,
      img: MarkdownImg,
      // p: (props) => <p {...props} className="mb-4 text-left md:text-left" />,
      // a: (props) => <a target="_blank" rel="noreferrer" {...props} className="text-blue-500" href={props.href} />,
      // div: (props) => <div {...props} className="mb-4" />,
    }}
    remarkPlugins={[remarkBreaks, remarkGfm, remarkMdx]}
  >
    {children}
  </ReactMarkdown>
);

export default Markdown;
