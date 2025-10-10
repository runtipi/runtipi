import { Markdown } from '@/components/markdown/markdown';
import { copilot } from '@uiw/codemirror-theme-copilot';
import ReactCodeMirror from '@uiw/react-codemirror';
import { AnimatePresence, motion } from 'framer-motion';
import { markdown } from '@codemirror/lang-markdown';

type Props = {
  meta: string;
  setMeta: (meta: string) => void;
  isEditing: boolean;
};

export const AppDescriptionEditor = ({ isEditing, meta, setMeta }: Props) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div key={isEditing ? 1 : 0} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        {isEditing ? (
          <ReactCodeMirror
            placeholder="My app notes in markdown..."
            value={meta}
            height="400px"
            onChange={(e) => setMeta(e)}
            theme={copilot}
            extensions={[markdown()]}
          />
        ) : (
          <Markdown content={meta.replace(/^---\s*\n([\s\S]*?)\n---\s*(?=\n|$)/m, '').trim()} className="markdown" />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
