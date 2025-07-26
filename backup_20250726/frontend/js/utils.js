// frontend/js/utils.js
import { processMathFormulas } from './math.js';

// 提取Python代码
export function extractPythonCode(text) {
    if (typeof text !== 'string') {
        return null;
    }
    const codeMatch = text.match(/```python\n([\s\S]*?)\n```/);
    if (codeMatch) {
        return codeMatch[1];
    }
    const altMatch = text.match(/```\n([\s\S]*?)\n```/);
    if (altMatch && (altMatch[1].includes('import') || altMatch[1].includes('def') || altMatch[1].includes('print'))) {
        return altMatch[1];
    }
    return null;
}

// 转换Markdown到HTML (更健壮的版本)
export function markdownToHtml(text) {
    if (!text) return '';

    // Escape basic HTML tags to prevent injection
    let html = text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Process multi-line code blocks first
    html = html.replace(/```python\n([\s\S]*?)```/g, (match, code) => {
        return `<pre><code class="language-python">${code}</code></pre>`;
    });

    // Process blocks separated by double newlines
    const blocks = html.split(/\n\s*\n/);

    const processedBlocks = blocks.map(block => {
        // Skip preformatted blocks
        if (block.startsWith('<pre>')) {
            return block;
        }

        // Headings
        if (block.startsWith('# ')) return `<h1>${block.substring(2)}</h1>`;
        if (block.startsWith('## ')) return `<h2>${block.substring(3)}</h2>`;
        if (block.startsWith('### ')) return `<h3>${block.substring(4)}</h3>`;

        // Unordered Lists
        if (block.match(/^\s*[-*] /)) {
            const items = block.split('\n').map(item => `<li>${item.replace(/^\s*[-*] /, '')}</li>`).join('');
            return `<ul>${items}</ul>`;
        }
        
        // Ordered Lists
        if (block.match(/^\s*\d+\. /)) {
            const items = block.split('\n').map(item => `<li>${item.replace(/^\s*\d+\. /, '')}</li>`).join('');
            return `<ol>${items}</ol>`;
        }

        // Paragraphs (and process inline elements within them)
        return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    });

    html = processedBlocks.join('');

    // Process inline elements that might span across blocks if not handled in paragraphs
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Process formulas
    html = processMathFormulas(html);

    return html;
}