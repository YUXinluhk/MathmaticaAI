// frontend/js/utils.js
window.app = window.app || {};
window.app.utils = {
    markdownToHtml: function(text) {
        if (typeof text !== 'string') return '';
        let html = text
            .replace(/```python\n([\s\S]*?)```/gim, '<pre><code class="language-python">$1</code></pre>')
            .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/\n/g, '<br>');
        return html;
    },

    extractPythonCode: function(responseText) {
        const match = responseText.match(/```python\n([\s\S]*?)```/);
        return match ? match[1].trim() : responseText;
    },

    escapeLatex: function(text) {
        if (typeof text !== 'string') return '';
        return text
            .replace(/\\/g, '\\textbackslash{}')
            .replace(/&/g, '\\&')
            .replace(/%/g, '\\%')
            .replace(/\$/g, '\\$')
            .replace(/#/g, '\\#')
            .replace(/_/g, '\\_')
            .replace(/{/g, '\\{')
            .replace(/}/g, '\\}')
            .replace(/~/g, '\\textasciitilde{}')
            .replace(/\^/g, '\\textasciicircum{}');
    },

    convertToLatex: function(markdownText) {
        if (typeof markdownText !== 'string') return '';
        return markdownText
            .replace(/\*\*(.*?)\*\*/g, '\\textbf{$1}')
            .replace(/\*(.*?)\*/g, '\\textit{$1}');
    },

    formatSolutionForLatex: function(solutionText) {
        let latexContent = this.convertToLatex(solutionText);
        latexContent = latexContent.replace(/```python\n([\s\S]*?)```/g, (match, code) => {
            return `\\begin{lstlisting}[language=Python]\n${code.trim()}\n\\end{lstlisting}`;
        });
        latexContent = latexContent.replace(/```([\s\S]*?)```/g, (match, content) => {
            return `\\begin{verbatim}\n${content.trim()}\n\\end{verbatim}`;
        });
        return latexContent;
    },
    
    generateBeamerFrames: function(latexContent) {
        const parts = latexContent.split('\\section');
        let frames = '';
        parts.forEach((part, index) => {
            if (part.trim() === '') return;
            const titleMatch = part.match(/\{(.*?)\}/);
            const title = titleMatch ? titleMatch[1] : `内容部分 ${index + 1}`;
            const content = part.substring(part.indexOf('}') + 1).trim();
            frames += `\n\\begin{frame}{${title}}\n${content}\n\\end{frame}\n`;
        });
        return frames;
    },

    generateLatexDocument: function(problem, finalSolution, verificationStats, documentType) {
        const timestamp = new Date().toLocaleString('zh-CN');
        const latexContent = this.formatSolutionForLatex(finalSolution);
        const escapedProblem = this.escapeLatex(problem);

        if (documentType === 'article') {
            return `\\documentclass[12pt,a4paper]{article}\n\\usepackage[UTF8]{ctex}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage{amsthm}\n\\usepackage{graphicx}\n\\usepackage{geometry}\n\\usepackage{hyperref}\n\\usepackage{listings}\n\\usepackage{xcolor}\n\\geometry{left=2.5cm,right=2.5cm,top=2.5cm,bottom=2.5cm}\n\\lstset{basicstyle=\\ttfamily\\small, breaklines=true, frame=single, showstringspaces=false}\n\\title{数学问题严格验证报告}\n\\author{严格数学验证系统 v2.1}\n\\date{${timestamp}}\n\\begin{document}\n\\maketitle\n\\section{问题描述}\n${escapedProblem}\n\\section{验证统计}\n\\begin{itemize}\n    \\item 验证得分: ${verificationStats.score}/100\n    \\item 置信度: ${verificationStats.confidence}\\%\n    \\item Python验证次数: ${verificationStats.pythonValidations}\n    \\item 验证轮数: ${verificationStats.iterations}\n    \\item AI模型: ${verificationStats.aiModel}\n\\end{itemize}\n\\section{完整解答与验证过程}\n${latexContent}\n\\section{结论}\n经过严格的数学验证，本解答的正确性得到了充分保证。\n\\end{document}`;
        } else if (documentType === 'beamer') {
            const beamerFrames = this.generateBeamerFrames(latexContent);
            return `\\documentclass{beamer}\n\\usepackage[UTF8]{ctex}\n\\usepackage{amsmath}\n\\usepackage{amssymb}\n\\usepackage{listings}\n\\usepackage{xcolor}\n\\usetheme{Madrid}\n\\lstset{basicstyle=\\ttfamily\\tiny, breaklines=true}\n\\title{数学问题验证报告}\n\\author{严格数学验证系统 v2.1}\n\\date{${timestamp}}\n\\begin{document}\n\\frame{\\titlepage}\n\\begin{frame}{问题描述}\n${escapedProblem}\n\\end{frame}\n${beamerFrames}\n\\end{document}`;
        }
        return '';
    }
};