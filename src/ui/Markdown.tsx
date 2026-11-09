import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import 'katex/dist/katex.min.css';
import { blockMath } from '../study/logic';
import { headingsOf } from '../study/format';

/**
 * Dibuja un resumen escrito en Markdown:
 * - remark-gfm: tablas, listas de tareas y tachado.
 * - remark-breaks: un salto de línea se respeta (los apuntes pegados no se juntan en un bloque).
 * - remark-math + KaTeX: fórmulas con $...$ o $$...$$.
 * - rehype-slug: cada título lleva un identificador para poder saltar a él desde el índice.
 */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeSlug, rehypeKatex]}
        // Las tablas anchas se desplazan de lado dentro de su marco, sin romper la hoja en el móvil.
        components={{ table: ({ node: _node, ...props }) => <div className="table-wrap"><table {...props} /></div> }}
      >
        {blockMath(text)}
      </ReactMarkdown>
    </div>
  );
}

/** Índice de la hoja: solo aparece si tiene al menos dos apartados. */
export function Toc({ text }: { text: string }) {
  const hs = headingsOf(text);
  if (hs.length < 2) return null;
  return (
    <nav className="toc" aria-label="Índice de la hoja">
      <p className="eyebrow">Índice</p>
      <ol>
        {hs.map((h) => (
          <li key={h.slug} className={h.level === 3 ? 'sub' : undefined}>
            <a
              href={`#${h.slug}`}
              onClick={(e) => {
                // El # de la dirección ya lo usa la navegación: aquí solo desplazamos la página.
                e.preventDefault();
                document.getElementById(h.slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
