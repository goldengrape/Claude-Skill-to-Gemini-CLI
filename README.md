<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SkillCompiler: Claude Skills to Gemini CLI Converter

SkillCompiler is a web application that "compiles" Skills designed for Anthropic Claude into self-contained `.toml` custom commands that can be used directly by the Google Gemini CLI.

This tool bridges the gap between the two AI ecosystems by automating "prompt transformation engineering," allowing users to migrate their complex, multi-file Skill workflows built for Claude into the Gemini CLI with a single click.

## Features

- **Input Flexibility**: Accept Claude Skills via Git repository URL or ZIP file upload
- **Intelligent Parsing**: Automatically identifies and processes all referenced resource files
- **Complete Conversion**: Transforms Claude's directory-based structure into Gemini's single-file format
- **Ready-to-Use Output**: Generates a downloadable package with the .toml file and installation instructions

## How It Works

1. **Input**: Provide your Claude Skill (via Git URL or ZIP upload) and specify a command name
2. **Processing**: The application parses the Skill's structure, extracts all referenced files, and packages them
3. **Conversion**: Using Google Gemini API, the application transforms the Claude Skill format into Gemini CLI format
4. **Output**: Download a ZIP package containing your ready-to-use Gemini CLI command

## Installation

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   ```
   npm run dev
   ```

## Vibe Coding Project

This project was created using the "vibe coding" approach - a method where a detailed software design document is created first, then implemented. Anyone can reproduce this project by inputting "vibe coding plan" into an AI that's smart enough to understand and execute the plan.

The complete design document can be found in [docs/vibe coding plan.md](docs/vibe%20coding%20plan.md), which includes:
- Detailed architecture and component definitions
- Functional requirements
- Module designs with implementation details
- Engineering implementation plan

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to help improve this tool.

## License

[MIT License](LICENSE)
