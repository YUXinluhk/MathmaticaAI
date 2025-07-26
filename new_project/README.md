# Mathmatica AI

Mathmatica AI 是一个全栈Web应用，旨在通过多步骤、迭代式的 AI 推理和代码验证，为复杂的数学问题提供高度可靠的解答。

## 核心功能

- **迭代式验证**: 应用采用一个严谨的多轮验证循环，每一轮都包括 AI 生成解题方案、自我改进、AI 交叉验证以及 Python 代码执行验证。
- **多 AI 服务商支持**: 可灵活切换使用 Google (Gemini)、OpenAI (GPT) 和 DeepSeek 的模型。
- **动态前端**: 纯原生 JavaScript、HTML 和 CSS 构建的动态用户界面，实时展示验证过程的每一步。
- **代码执行**: 后端能够安全地执行由 AI 生成的 Python 代码（利用 `numpy`, `sympy` 等库），并将计算结果作为验证的一环。
- **数据导出**: 支持将完整的验证流程（包括问题、各轮次的解决方案、错误报告、Python 代码和执行结果）打包下载为 ZIP 文件。

## 技术栈

### 前端

- **语言**: HTML, CSS, JavaScript (ES6+)
- **核心库**:
    - **MathJax**: 用于在浏览器中精美地渲染 LaTeX 数学公式。
    - **JSZip**: 用于在客户端生成和下载包含验证报告的 ZIP 文件。
- **运行方式**: 通过标准的 Python HTTP 服务器在 8080 端口上运行。

### 后端

- **框架**: Python 3.12+ 与 **FastAPI**
- **核心库**:
    - **Uvicorn**: 作为 ASGI 服务器运行 FastAPI 应用。
    - **Requests**: 用于向第三方 AI API 发送 HTTP 请求。
    - **python-dotenv**: 用于管理环境变量（如 API 密钥）。
    - **google-generativeai**, **openai**: 官方提供的 AI 服务 Python 客户端。
    - **NumPy, SciPy, SymPy, Matplotlib**: 为 AI 生成的 Python 验证代码提供核心的科学计算和绘图支持。
- **运行方式**: 通过 `uvicorn` 在 8000 端口上运行。

## 核心逻辑与工作流

Mathmatica AI 的核心是一个被称为“严谨验证” (Rigorous Verification) 的循环。当用户输入一个问题并点击“求解”时，系统会启动以下迭代过程：

1.  **生成初始解 (Initial Solution)**: 后端根据用户问题，调用 AI 模型生成一个详细的解题步骤。
2.  **自我改进 (Self-Improvement)**: 系统将生成的解答再次发送给 AI，要求其审查和改进，以发现潜在的逻辑缺陷或更优的解法。
3.  **AI 验证 (AI Verification)**: 将改进后的解法交给另一个独立的 AI 实例进行验证，并生成一份详细的错误报告。如果未发现错误，则报告会明确指出“验证通过”。
4.  **Python 验证 (Python Validation)**: 系统从 AI 的解答中提取出 ` ```python ... ``` ` 代码块，并在安全的后端环境中执行。这为理论解法提供了计算上的支持。
5.  **审查与决策 (Review and Decision)**:
    - 如果 AI 验证报告中没有发现错误，则“连续通过次数” (Consecutive Passes) 加一。
    - 如果发现错误，则将计数器清零，并将错误报告作为上下文，在下一轮迭代中交给 AI 以生成修正后的解法。
6.  **循环与终止**:
    - 循环会持续进行，直到“连续通过次数”达到预设的要求（例如 3 次）。
    - 循环也可能因为达到最大迭代次数或用户手动停止而终止。

整个过程的状态和结果都会实时地展示在前端界面上。

## 如何启动

### 1. 环境准备

- 确保您的系统已安装 Python 3.12+。

- **激活后端虚拟环境**:
  首先，进入后端目录并激活已包含的虚拟环境。
  - **Windows**:
    ```bash
    cd backend
    .\venv\Scripts\activate
    ```
  - **macOS / Linux**:
    ```bash
    cd backend
    source venv/bin/activate
    ```
  *激活后，您的终端提示符前应出现 `(venv)` 字样。*

- **安装后端依赖**:
  *在已激活虚拟环境的终端中*，运行以下命令安装所有必需的库：
  ```bash
  pip install -r requirements.txt
  ```

- **设置环境变量**:
  在 `backend/` 目录下创建一个名为 `.env` 的文件，并填入您的 API 密钥：
  ```
  GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
  OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
  DEEPSEEK_API_KEY="YOUR_DEEPSEEK_API_KEY"
  ```

### 2. 启动后端服务

在 **第一个** 已激活虚拟环境的终端窗口中，从 `backend` 目录执行：

```bash
uvicorn main:app --reload
```
后端服务将在 `http://localhost:8000` 上运行。

### 3. 启动前端服务

在 **第二个** 终端窗口中，从项目根目录执行：

```bash
cd frontend
python -m http.server 8080
```
前端应用将在 `http://localhost:8080` 上可用。

现在，您可以在浏览器中打开 `http://localhost:8080` 来使用 Mathmatica AI。
