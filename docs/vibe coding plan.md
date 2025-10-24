### **Software Design Document: SkillCompiler (v1.1)**

**Project Name:** SkillCompiler
**Version:** 1.1 (Web Application)
**Date:** October 24, 2025
**Document Status:** Official

---

### 1. Overview

#### 1.1 Project Goal

SkillCompiler is a web application whose core goal is to "compile" a Skill designed for Anthropic Claude into a **self-contained `.toml` custom command** that can be used directly by the Google Gemini CLI.

This tool bridges the gap between the two AI ecosystems by automating "prompt transformation engineering," allowing users to migrate their complex, multi-file Skill workflows built for Claude into the Gemini CLI with a single click.

#### 1.2 Core Technologies

*   **Backend:** Python (FastAPI/Flask) or Node.js (Express)
*   **Core Logic:** Google Gemini API (via AI Studio or Vertex AI)
*   **Frontend:** Basic HTML / CSS / JavaScript

---

### 2. Architecture and Component Definition

To understand the design of this software, one must first understand the structural differences between the source (Claude) and the target (Gemini).

#### 2.1 Source: Claude Skill Structure

A Claude Skill is a **directory-based, declarative** structure.

*   **Form:** A folder containing multiple files (e.g., `my_skill/`).
*   **Core Instructions (`SKILL.MD`):**
    *   A Markdown file that serves as the "instruction manual" for the Skill.
    *   It uses **natural language** to define the Skill's **role**, **capabilities**, **tools**, and execution steps.
*   **Resource Files (`.js`, `.html`, `.json`, `.txt`):**
    *   `SKILL.MD` references other files in the same directory, which are the "knowledge" or "tool" code necessary for the Skill's execution.
*   **Execution Logic (Inferred):** When a user invokes `@my_skill`, Claude's backend parses `SKILL.MD` and automatically loads the **contents of all referenced resource files** into the LLM's context, forming a complete "mega-prompt."

#### 2.2 Target: Gemini CLI TOML Structure

A Gemini CLI custom command is a **single-file, inline** structure.

*   **Form:** A single `.toml` file (e.g., `my_skill.toml`).
*   **Filename as Command:** `my_skill.toml` is registered as the `/my_skill` command.
*   **Core Fields:**
    *   `description = "..."`: A short string description.
    *   `prompt = """..."""`: The **most crucial field**. This is a multi-line string containing the **complete system prompt** sent to the Gemini model when the user invokes the command.
*   **Execution Logic:**
    *   **Self-Contained:** Unlike Claude, the Gemini CLI does not automatically load external files. Therefore, the **entire content** of files like `code.js`, `style.html`, etc., must be **pre-inlined** into this `prompt` string.
    *   **Arguments:** Any additional arguments entered by the user in the CLI are automatically appended to the end of the `prompt`.

---

### 3. Functional Requirements (FRs)

*   **FR1:** The software must accept one of the following two input methods to obtain the source files for a Claude Skill:
    *   **FR1a:** A **URL to a public Git repository** containing the Skill.
    *   **FR1b:** A **`.zip` archive** upload containing the Skill's root directory.
*   **FR2:** The software must accept an **output command name** (e.g., `/art`) as input (via a text box on the web page).
*   **FR3:** The software must be able to find and read `SKILL.MD` within the fetched source files.
*   **FR4:** The software must be able to parse `SKILL.MD` and automatically identify all referenced **local** resource files (e.g., `.js`, `.html`, `.py`).
*   **FR5:** The software must be able to read the **full content** of all referenced resource files.
*   **FR6:** The software must **package** the content of `SKILL.MD` and all resource files into a structured "Context Blob" string.
*   **FR7:** The software must call the Google Gemini API, providing this "Context Blob" as input, and request the AI to **refactor** it into a Gemini CLI `.toml` formatted string.
*   **FR8:** The software must be able to extract the `description` and `prompt` content from the Gemini API's response.
*   **FR9:** The software must generate a `.zip` archive **for the user to download**. This archive must contain:
    *   **FR9a:** A `.toml` file named according to FR2 (e.g., `art.toml`).
    *   **FR9b:** A `README.md` file explaining to the user how to install this `.toml` file into the Gemini CLI.

---

### 4. Axiomatic Design Analysis (FRs -> DPs Mapping)

This design employs an **Uncoupled Design**, ensuring that each functional requirement is met by an independent design parameter (module), creating a clear data flow.

| Functional Requirement (FR) | Description | Design Parameter (DP) / Module |
| :--- | :--- | :--- |
| FR1, FR2 | Receive web input (URL/ZIP, command name) | **DP1: M1 - Web Interface & Input Processor** |
| (FR1a, FR1b) | Clone from URL or extract source files from ZIP | **DP1.1: M1.1 - Source File Fetcher** |
| FR3, FR4, FR5 | Find, parse, and read the Skill directory and files | **DP2: M2 - Skill Parser** |
| FR6 | Aggregate all file contents | **DP3: M3 - Context Packager** |
| FR7, FR8 | Call AI API to perform the core conversion | **DP4: M4 - Gemini Conversion Engine** |
| FR9 (a, b) | Generate a .zip package with `.toml` and `README` | **DP5: M5 - ZIP Package Generator** |

---

### 5. Module Design (Detailed Specification)

#### M1: Web Interface & Input Processor

*   **Technology:** FastAPI (Python) or Express (Node.js).
*   **Endpoint:** `POST /api/v1/compile` (using `multipart/form-data` encoding).
*   **Logic:**
    1.  Parse the `POST` request body.
    2.  Extract `output_name` (form field).
    3.  Extract `skill_url` (form field) or `skill_zip_file` (file upload).
    4.  Call **M1.1 (Source File Fetcher)**, passing the URL or ZIP file object.
    5.  M1.1 returns a temporary server directory path (`temp_skill_dir`).
    6.  Pass `temp_skill_dir` and `output_name` to M2.
    7.  **Cleanup:** At the end of the entire request-response cycle (whether success or failure), a `try...finally` block must be used to ensure `temp_skill_dir` is safely deleted.

#### M1.1: Source File Fetcher (Sub-module of M1)

*   **Input:** URL string or ZIP file object.
*   **Logic (FR1a - URL):**
    1.  Create a unique temporary directory (e.g., `temp/[UUID]/`).
    2.  Use `subprocess.run` to safely execute `git clone --depth 1 [URL] [temp_dir]`.
    3.  Handle Git clone failures and security injection (e.g., `command injection`) exceptions.
*   **Logic (FR1b - ZIP):**
    1.  Create a unique temporary directory.
    2.  Use the `zipfile` (Python) library to safely extract the uploaded ZIP file to the temporary directory.
    3.  **Security:** Must check for "Path Traversal" attacks (Zip Slip) to ensure all files are extracted within the target directory.
*   **Output:** `temp_skill_dir` (the path to the temporary directory).

#### M2: Skill Parser

*   **Input:** `temp_skill_dir` path.
*   **Logic:**
    1.  Search for `SKILL.MD` (case-insensitive) in `temp_skill_dir`.
    2.  If not found, return a 400 Bad Request error to the user.
    3.  Read the entire content of `SKILL.MD`.
    4.  Use regular expressions (e.g., `(./[^\s)]+)` or `href="([^"]+)"`) to find all **local file references** in `SKILL.MD`.
*   **Output:**
    *   `skill_md_content` (string)
    *   `referenced_files_paths` (list of file paths)

#### M3: Context Packager

*   **Input:** `skill_md_content` and `referenced_files_paths`.
*   **Logic:**
    1.  Initialize a large string, `context_blob`.
    2.  Add `skill_md_content` to `context_blob`, wrapped with delimiters.
    3.  Iterate through the `referenced_files_paths` list:
        *   Read the full content of each file (using UTF-8 encoding).
        *   Add the file content (along with its filename) to `context_blob`, wrapped with delimiters.
*   **Output:** `context_blob` (a large string).
    *   **Example `context_blob` string:**
        ```text
        --- BEGIN FILE: SKILL.MD ---
        You are an algorithmic artist... You can use code.js and style.html ...
        --- END FILE: SKILL.MD ---

        --- BEGIN FILE: code.js ---
        function drawCircle(ctx) { ... }
        --- END FILE: code.js ---

        --- BEGIN FILE: style.html ---
        <canvas id="myCanvas"></canvas>
        --- END FILE: style.html ---
        ```

#### M4: Gemini Conversion Engine (Core Module)

*   **Input:** `context_blob` string.

*   **Technology:** `google-generativeai` (Gemini API client).

*   **Logic:** Call the Gemini API (e.g., `gemini-1.5-pro`) and use the following carefully crafted "Meta-Prompt" to perform the conversion task.

    **--- [Meta-Prompt for Gemini] ---**

    You are an expert AI software engineer, proficient in both Claude Skills and the Gemini CLI.
    Your task is to convert (compile) the entire context of a Claude Skill into a `.toml` custom command file for the Gemini CLI.

    **Claude Skill Structure (Input):**
    I will provide you with a "Context Blob" that packages all the Skill's files using delimiters like `--- BEGIN FILE: [filename] ---`. `SKILL.MD` is the main instruction, and other files are its referenced resources.

    **Gemini CLI TOML Structure (Output):**
    You must generate a string in `.toml` file format, which must include:

    1.  `description = "..."`: A single, brief sentence describing the skill, distilled from the intent of `SKILL.MD`.
    2.  `prompt = """..."""`: A **single, complete** prompt.

    **Conversion Rules:**

    1.  **Inline Everything:** You must **inline** the instructions from `SKILL.MD` and the **entire content** of all resource files (`.js`, `.html`, etc.) into the single `prompt` field.
    2.  **Refactor Instructions:** Rewrite the descriptions for humans in `SKILL.MD` ("This is a Skill...") into **direct instructions** for the Gemini model (e.g., "You are an algorithmic artist...").
    3.  **Provide Context:** In the `prompt`, you must explicitly tell Gemini: "You will use the following code: ...[paste code.js content]... You will use the following HTML structure: ...[paste style.html content]...".
    4.  **Handle Arguments:** The end of the `prompt` must include a placeholder to receive user-provided arguments from the CLI. For example: "Now, perform the task based on the user's following request:"
    5.  **Format:** Your output **must only** be the raw TOML formatted text, starting with `description =`. Do not include any conversational pleasantries like "Certainly, here is your file."

    **[Input] Context Blob:**

    ```
    {{context_blob}}
    ```

    **[Output] TOML File Content:**

    **--- [End of Meta-Prompt] ---**

*   **Output:** A string containing the `.toml` content.

#### M5: ZIP Package Generator

*   **Input:** `toml_string` (from M4) and `output_name` (from M1, e.g., `/art`).
*   **Technology:** `io.BytesIO` and `zipfile.ZipFile` (Python) for creating a ZIP file in memory.
*   **Logic:**
    1.  Extract the filename from `output_name` (e.g., `art`). The `toml_filename` will be `art.toml`.
    2.  Create a ZIP file in memory.
    3.  **(FR9a)** Write the `toml_string` provided by M4 into the in-memory zip package with the filename `[toml_filename]`.
    4.  **(FR9b)** Generate the content for the `README.md` file (see template below).
    5.  Write the `README.md` string into the in-memory zip package.
*   **Output:** A **byte stream** containing the `.zip` file data, ready to be sent to the user via an HTTP response.

**`README.md` Template:**

````markdown
# Gemini CLI Skill: [output_name]

Thank you for using SkillCompiler!

## 1. Installation

1.  Copy the `[toml_filename]` file from this archive into your Gemini CLI commands directory.
2.  On macOS / Linux, this directory is typically located at: `~/.gemini/commands/`
3.  On Windows, this directory is typically located at: `%APPDATA%\gemini\commands\`

**macOS / Linux Quick Command:**
(Run this in the same directory after extracting this archive)
```bash
mkdir -p ~/.gemini/commands/
cp [toml_filename] ~/.gemini/commands/
```

## 2. Usage

Restart your Gemini CLI (if it's running). You can now use the new slash command:

```bash
gemini [output_name] [your arguments...]
```
````

---

### 6. Engineering Implementation Plan

**Phase 1: V0.1 - Core Functionality Validation (Meta-Prompt Engineering)**
*   **Goal:** Validate the effectiveness of the "Meta-Prompt" for M4 (Gemini Conversion Engine).
*   **Tasks:**
    *   **Manually** perform M2 and M3: Select 3-5 Claude Skill examples of varying complexity.
    *   **Manually** assemble the `context_blob`.
    *   **Manually** open the Google AI Studio website.
    *   Paste the "Meta-Prompt" from M4 into AI Studio and append the `context_blob`.
    *   **Iterate:** Repeatedly adjust the "Meta-Prompt" until the output `.toml` is stable, correct, and efficient.

**Phase 2: V0.2 - Automation Script (Local Prototype)**
*   **Goal:** Script the manual process from V0.1.
*   **Tasks:**
    *   Write Python/Node.js scripts for M2, M3, M4, and M5.
    *   Use local file paths as input (instead of a web interface).
    *   **Acceptance Criteria:** The script can run and successfully generate a `.zip` file locally containing the `.toml` and `README.md`.

**Phase 3: V1.0 - Web Application Backend (MVP)**
*   **Goal:** Set up the web server and integrate all modules.
*   **Tasks:**
    *   Implement **M1 (Web Interface)** using FastAPI.
    *   Implement **M1.1 (Fetcher)**, ensuring security for `git clone` and `zipfile`, and proper temporary file cleanup (using `try...finally` and the `tempfile` library).
    *   Integrate the script logic from V0.2 into the `POST /api/v1/compile` route.
    *   **Acceptance Criteria:** The API endpoint can be successfully called by Postman or cURL and returns a downloadable `.zip` file.

**Phase 4: V1.1 - Frontend Interface (Public Release)**
*   **Goal:** Create a simple user interface.
*   **Tasks:**
    *   Create `index.html`, `style.css`, `app.js` static files.
    *   The page should include:
        *   A text box for "Enter command name" (FR2).
        *   A text box for "Git URL" (FR1a).
        *   An "Upload ZIP file" button (FR1b).
        *   A "Convert" button that shows a loading state when clicked.
    *   Use the JavaScript `fetch` API to call the V1.0 backend endpoint and handle the returned ZIP file download.

**Phase 5: V2.0 - Robustness & Enhancements (Future Planning)**
*   **Tasks:**
    *   **Caching:** Implement caching based on Git commit hash or ZIP file hash (MD5/SHA256) to avoid expensive Gemini API calls for unchanged Skills.
    *   **Batch Conversion:** Support Git repositories or ZIP files containing multiple Skill subdirectories.
    *   **Error Handling:** Return more user-friendly JSON error messages to the frontend (e.g., "SKILL.MD not found in ZIP").