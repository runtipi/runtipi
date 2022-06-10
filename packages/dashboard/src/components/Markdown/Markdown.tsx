import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';

const Markdown: React.FC<{ children: string; className: string }> = ({ children, className }) => {
  return (
    <ReactMarkdown
      className={className}
      components={{
        h1: (props) => <h1 {...props} className="text-2xl font-bold mb-4 text-center md:text-left" />,
        h2: (props) => <h2 {...props} className="text-xl font-bold mb-4 text-center md:text-left" />,
        h3: (props) => <h3 {...props} className="text-lg font-bold mb-4 text-center md:text-left" />,
        ul: (props) => <ul {...props} className="list-disc pl-4 mb-4" />,
        img: (props) => (
          <div className="flex justify-center py-2">
            <img {...props} className="w-full lg:w-2/3" />
          </div>
        ),
        p: (props) => <p {...props} className="mb-4 text-center md:text-left" />,
        a: (props) => <a target="_blank" rel="noreferrer" {...props} className="text-blue-500" href={props.href} />,
        div: (props) => <div {...props} className="mb-4" />,
      }}
      remarkPlugins={[remarkBreaks, remarkGfm, remarkMdx]}
    >
      {children}
    </ReactMarkdown>
  );
};

export default Markdown;
