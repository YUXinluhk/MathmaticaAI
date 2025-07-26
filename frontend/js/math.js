// frontend/js/math.js

// 数学公式处理
export function processMathFormulas(text) {
    if (!text || typeof text !== 'string') return text;
    
    let processedText = text;

    // 精确分数替换
    processedText = processedText.replace(/0\.3333?3?/g, '\\(\frac{1}{3}\\)');
    processedText = processedText.replace(/0\.6666?6?/g, '\\(\frac{2}{3}\\)');
    processedText = processedText.replace(/0\.5/g, '\\(\frac{1}{2}\\)');
    processedText = processedText.replace(/0\.25/g, '\\(\frac{1}{4}\\)');
    processedText = processedText.replace(/0\.75/g, '\\(\frac{3}{4}\\)');
    processedText = processedText.replace(/1\.414/g, '\\(\sqrt{2}\\)');
    processedText = processedText.replace(/1\.732/g, '\\(\sqrt{3}\\)');
    processedText = processedText.replace(/2\.236/g, '\\(\sqrt{5}\\)');

    // 高亮重要公式
    processedText = processedText.replace(/\\\\[(.*?)\\\\]/gs, (match, formula) => {
        return `<div class="formula-highlight">\\[${formula}\\]</div>`;
    });

    return processedText;
}

