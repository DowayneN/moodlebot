# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/133ffede-0cb3-4863-95a7-e54fbb8542c7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/133ffede-0cb3-4863-95a7-e54fbb8542c7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/133ffede-0cb3-4863-95a7-e54fbb8542c7) and click on Share -> Publish.

## I want to use a custom domain - is that possible?

We don't support custom domains (yet). If you want to deploy your project under your own domain then we recommend using Netlify. Visit our docs for more details: [Custom domains](https://docs.lovable.dev/tips-tricks/custom-domain/)

## Environment Setup

This project requires API keys from OpenAI and Pinecone to function properly. Follow these steps to set up your environment:

1. Clone the repository and install dependencies:
   ```sh
   git clone <YOUR_REPOSITORY_URL>
   cd moodlebot-chatwave
   npm install
   ```

2. Copy the example environment file:
   ```sh
   cp .env.example .env
   ```

3. Get your API keys:
   - **OpenAI API Key**: 
     - Visit [OpenAI's API Keys page](https://platform.openai.com/api-keys)
     - Click "Create new secret key"
     - Copy the key (you won't be able to see it again!)
   
   - **Pinecone API Key**:
     - Sign up/Login to [Pinecone](https://app.pinecone.io/)
     - Navigate to API Keys in your dashboard
     - Create a new key if needed
     - Copy your API key

4. Update your `.env` file with your API keys:
   ```sh
   VITE_OPENAI_API_KEY=your-openai-api-key-here
   VITE_PINECONE_API_KEY=your-pinecone-api-key-here
   ```

5. Start the development server:
   ```sh
   npm run dev
   ```

⚠️ **Important Security Notes**: 
- Never commit your `.env` file or share your API keys
- The `.env` file is listed in `.gitignore` to prevent accidental commits
- If you accidentally expose your API keys, immediately rotate them in your OpenAI and Pinecone dashboards
- For production deployment, set environment variables in your hosting platform (e.g., Netlify, Vercel) rather than using a .env file
