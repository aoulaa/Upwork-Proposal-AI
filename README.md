# Upwork Proposal AI ✦

An intelligent, **completely free**, and **privacy-focused** Chrome Extension that generates high-conversion, personalized Upwork proposals using the Google Gemini API. Your data never leaves your machine—everything is stored and processed locally via your own API key.

## 🚀 Features

- **Gemini-Powered Proposals**: Uses **Gemini 1.5 Pro** (Recommended) for superior human-like, targeted writing and complex reasoning.
- **Context-Aware**: Automatically extracts job titles and descriptions from Upwork job pages.
- **Project-Matching**: Matches your past experience from `projects.json` to the client's specific tech stack.
- **Rule-Based Writing**: Enforces "sick intros," natural flow, and no-fluff constraints.
- **Customizable rules**: Easily tweak your tone, CTAs, and formatting via `rules.json`.
- **Privacy-First**: Your API key and profile data are stored locally in your browser.

## 🛠️ Installation

Since this is a developer-unpacked extension, follow these steps to install it:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/upwork-proposal-ai.git
   ```
2. **Open Chrome Extensions**:
   Navigate to `chrome://extensions/` in your Google Chrome browser.
3. **Enable Developer Mode**:
   Toggle the **Developer mode** switch in the top-right corner.
4. **Load Unpacked**:
   Click the **Load unpacked** button and select the `extension` folder from this repository.

## ⚙️ Configuration

Before use, you must configure your freelancer data:

1. **Profile**: Edit `extension/data/profile.json` with your personal details and skills.
2. **Projects**: Add your work history to `extension/data/projects.json`. The AI will use these to match job requirements.
3. **Rules**: Tweak `extension/data/rules.json` to change the AI's "voice," preferred CTAs, and word limits.

## 📖 How to Use

1. **Set API Key**:
   - Open the extension side panel.
   - Enter your [Google Gemini API Key](https://aistudio.google.com/app/apikey).
   - *Note: We highly recommend using the **Gemini 1.5 Pro** model for the best quality and adherence to rules.*
2. **Navigate to Upwork**:
   - Go to any Upwork job post.
3. **Generate**:
   - Click "Apply Now".
   - The extension side panel will detect the job context and automatically generate a draft for your cover letter and any screening questions.
4. **Review & Submit**:
   - The generated content is inserted directly into the Upwork application fields. Review, edit if needed, and submit!

## 🔒 Privacy & Security

- **100% Local**: All your sensitive data (Profile, Projects, and Rules) is stored locally within the `data/` folder or your browser's local storage.
- **No Third-Party Servers**: This extension does not use a middle-man backend. It communicates directly from your browser to the Google Gemini API.
- **Your Keys, Your Control**: You use your own Gemini API key, ensuring you have full control over your usage and costs (Gemini has a very generous free tier).

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, better prompts, or improvements to the extension:

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - feel free to use and modify for your own freelance career!
