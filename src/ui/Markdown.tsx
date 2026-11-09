import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { blockMath } from '../study/logic';

/**
 * Dibuja un resumen escrito en Markdown:
 * tablas y listas (remark-gfm) y fórmulas con $...$ o $$...$$ (remark-math + KaTeX).
 */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {blockMath(text)}
      </ReactMarkdown>
    </div>
  );
}
