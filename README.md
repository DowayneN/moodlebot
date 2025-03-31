# MoodleBot ChatWave

An AI-powered chatbot interface for Moodle, built with modern web technologies.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Git](https://git-scm.com/downloads) (version 2.x or higher)
- [Node.js](https://nodejs.org/) (version 16.x or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)
- A text editor or IDE (e.g., [VS Code](https://code.visualstudio.com/), [WebStorm](https://www.jetbrains.com/webstorm/))
- A modern web browser (Chrome, Firefox, Safari, or Edge)

You'll also need:
- An [OpenAI account](https://platform.openai.com/signup) with API access
- A [Pinecone account](https://app.pinecone.io/) for vector storage

## Technologies Used

This project is built with:
- [Vite](https://vitejs.dev/) - Next Generation Frontend Tooling
- [TypeScript](https://www.typescriptlang.org/) - JavaScript with syntax for types
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [shadcn/ui](https://ui.shadcn.com/) - Re-usable components built with Radix UI and Tailwind CSS
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework

## Getting Started

1. Clone the repository:
   ```sh
   git clone https://github.com/DowayneN/moodlebot-chatwave.git
   cd moodlebot-chatwave
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Copy the example environment file:
   ```sh
   cp .env.example .env
   ```

4. Get your API keys:
   - **OpenAI API Key**: 
     - Visit [OpenAI's API Keys page](https://platform.openai.com/api-keys)
     - Click "Create new secret key"
     - Copy the key (you won't be able to see it again!)
   
   - **Pinecone API Key**:
     - Sign up/Login to [Pinecone](https://app.pinecone.io/)
     - Navigate to API Keys in your dashboard
     - Create a new key if needed
     - Copy your API key

5. Update your `.env` file with your API keys:
   ```sh
   VITE_OPENAI_API_KEY=your-openai-api-key-here
   VITE_PINECONE_API_KEY=your-pinecone-api-key-here
   ```

6. Start the development server:
   ```sh
   npm run dev
   ```

7. Open your browser and visit `http://localhost:5173` (or the URL shown in your terminal)

## Development

### Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build locally

### Project Structure

```
moodlebot-chatwave/
├── src/
│   ├── components/    # React components
│   ├── hooks/        # Custom React hooks
│   ├── services/     # API and service integrations
│   ├── utils/        # Utility functions
│   └── pages/        # Page components
├── public/           # Static assets
└── ...config files
```

## Deployment

You can deploy this application using any static site hosting service. We recommend:
- [Vercel](https://vercel.com/)
- [Netlify](https://www.netlify.com/)
- [GitHub Pages](https://pages.github.com/)

Remember to set up your environment variables (API keys) in your hosting platform's settings.

⚠️ **Important Security Notes**: 
- Never commit your `.env` file or share your API keys
- The `.env` file is listed in `.gitignore` to prevent accidental commits
- If you accidentally expose your API keys, immediately rotate them in your OpenAI and Pinecone dashboards
- For production deployment, set environment variables in your hosting platform rather than using a .env file

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
