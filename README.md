# 🛠️ Engineering Modeling and Simulation Platform

## 🌟 Project Vision

This platform aims to revolutionize the engineering workflow by leveraging AI to automate modeling, simulation, and analysis. It provides engineers with an intelligent assistant that can understand complex engineering problems, generate simulation scripts, execute them in various solvers, and analyze the results. Our goal is to significantly reduce the time and effort required for engineering simulations, allowing engineers to focus on innovation and problem-solving.

## ✨ Core Features

- **Natural Language-based Problem Description**: Describe your engineering problem in plain English.
- **AI-powered Modeling**: The platform automatically generates physical models based on your description.
- **Python-based Simulations**: The platform leverages the power of Python for running simulations and analyzing results.
- **Automated Simulation & Analysis**: The platform runs the simulations and provides a detailed analysis of the results.
- **Optimization Workflow**: Define an optimization goal, and the platform will iteratively adjust parameters to find the optimal solution.
- **Data Upload**: Upload CSV files with comparative data for more accurate simulations.
- **LaTeX Report Generation**: Automatically generate professional reports of your simulation results.

## 🏗️ Technical Architecture

The platform is built with a modern web stack and a powerful backend:

- **Frontend**: A responsive user interface built with HTML, CSS, and vanilla JavaScript. It communicates with the backend via a RESTful API.
- **Backend**: A Python-based backend using FastAPI. It orchestrates the entire workflow, from calling the AI models to executing the simulation scripts.
- **AI Integration**: The platform integrates with various large language models (LLMs) like Google's Gemini, OpenAI's GPT-4, and DeepSeek to understand and solve engineering problems.
- **Solver Agents**: A specialized agent is responsible for interacting with the Python solver, ensuring that the generated scripts are executed correctly.

## 🚀 How to Use

1. **Describe the Problem**: In the "问题描述" (Problem Description) text area, describe the engineering problem you want to solve.
2. **Set Parameters**: Define the physical parameters of your model using the "物理参数" (Physical Parameters) section.
3. **Upload Data (Optional)**: If you have comparative data in a CSV file, you can upload it using the "对比数据" (Comparative Data) section.
4. **Set Optimization Goal (Optional)**: If you want to run an optimization, enter your goal in the "（可选）输入优化目标" (Optional: Enter Optimization Goal) text box.
5. **Start Simulation**: Click the "开始建模与仿真" (Start Modeling & Simulation) button.
6. **View Results**: The platform will display the results of each step of the workflow, including the physical model, simulation script, execution results, and analysis.
7. **Generate Report**: Once the simulation is complete, you can generate a LaTeX report of the results.
