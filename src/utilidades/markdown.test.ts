import { describe, expect, it } from 'vitest';
import { markdownAHtml, resumenMarkdown } from './markdown';

describe('markdown', () => {
  it('convierte títulos, negrita, cursiva y código', () => {
    expect(markdownAHtml('# Derivadas')).toBe('<h2>Derivadas</h2>');
    expect(markdownAHtml('La **regla** de la *cadena* y `f(g(x))`')).toBe(
      '<p>La <strong>regla</strong> de la <em>cadena</em> y <code>f(g(x))</code></p>',
    );
  });

  it('arma listas y bloques de código', () => {
    expect(markdownAHtml('- uno\n- dos')).toBe('<ul><li>uno</li><li>dos</li></ul>');
    expect(markdownAHtml('1. a\n2. b')).toBe('<ol><li>a</li><li>b</li></ol>');
    expect(markdownAHtml('```\nx < 2\n```')).toBe('<pre><code>x &lt; 2</code></pre>');
  });

  it('escapa HTML para evitar código inyectado', () => {
    const html = markdownAHtml('<img src=x onerror=alert(1)> **<b>**');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('solo enlaza direcciones http o https', () => {
    expect(markdownAHtml('[ok](https://ejemplo.co)')).toContain('href="https://ejemplo.co"');
    expect(markdownAHtml('[mal](javascript:alert(1))')).not.toContain('<a');
  });

  it('resume el texto sin marcas', () => {
    expect(resumenMarkdown('# Título\n\n**Hola** mundo', 50)).toBe('Título Hola mundo');
    expect(resumenMarkdown('a'.repeat(20), 10)).toHaveLength(10);
  });
});
