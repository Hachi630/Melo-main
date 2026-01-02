# 🚀 AI-Powered Social Media & Marketing Manager - Melo

Melo is an AI-powered social media and marketing management platform that helps businesses create, manage, and optimize their social media content and marketing strategies.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Twitter/X Integration](#-twitterx-integration)
- [LinkedIn Integration](#-linkedin-integration)
- [Troubleshooting](#-troubleshooting)
- [API Documentation](#api-documentation)
- [Development](#development)

## ✨ Features

- **User Authentication**: Secure login and registration system with JWT authentication
- **Dashboard**: Clean and intuitive interface for managing your marketing activities
- **Brand Profile**: Configure your brand's tone of voice, target audience, and knowledge base
- **Smart Calendar**: Schedule and manage your marketing campaigns with support for multiple platforms (Instagram Post/Story/Reels, TikTok, Facebook, Twitter/X, LinkedIn)
- **Twitter/X Integration**: Connect your Twitter account via OAuth and share content directly to your Twitter profile
- **LinkedIn Integration**: Connect your LinkedIn account and share content directly to your LinkedIn profile
- **Calendar Item Images**: Upload images or generate images using AI for calendar items, with support for both file upload and base64 encoding
- **AI Chat Interface**: AI-powered chat interface for content creation and marketing assistance with conversation history
- **Image Generation**: Generate images using AI based on text prompts (manual input or auto-generated from content)
- **Conversation Management**: Save and manage chat conversations with message history
- **Responsive Design**: Modern UI built with Ant Design, fully responsive across devices

## 🛠 Tech Stack

### Frontend

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Ant Design 6** - UI component library
- **React Router DOM 6** - Routing
- **CSS Modules** - Component-scoped styling
- **dayjs** - Date manipulation

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **MongoDB** - Database (via Mongoose)
- **JWT** - Authentication tokens
- **dotenv** - Environment variable management
- **multer** - File upload handling
- **Google Gemini API** - AI chat and image generation

## 📁 Project Structure

```
Melo/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ChatBox.tsx
│   │   │   ├── AuthModal.tsx
│   │   │   ├── ImageGenerationModal.tsx
│   │   │   ├── CalendarItemModal.tsx
│   │   │   ├── ContentPlanModal.tsx
│   │   │   └── LinkedInDashboard.tsx
│   │   ├── pages/           # Page components
│   │   │   ├── BrandProfile.tsx
│   │   │   ├── Calendar.tsx
│   │   │   └── CalendarPlaceholder.tsx
│   │   ├── services/        # API service layer
│   │   │   ├── authService.ts
│   │   │   ├── chatService.ts
│   │   │   ├── calendarService.ts
│   │   │   ├── uploadService.ts
│   │   │   ├── twitterService.ts
│   │   │   └── linkedinService.ts
│   │   ├── constants/       # Constants and assets
│   │   │   └── assets.ts
│   │   └── App.tsx          # Main app component
│   └── package.json
│
├── backend/                  # Express backend API
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   │   └── database.ts
│   │   ├── models/          # MongoDB models
│   │   │   ├── User.ts
│   │   │   ├── Conversation.ts
│   │   │   ├── CalendarItem.ts
│   │   │   ├── TwitterToken.ts
│   │   │   └── TwitterRequestToken.ts
│   │   ├── routes/          # API routes
│   │   │   ├── auth.ts
│   │   │   ├── chat.ts
│   │   │   ├── calendar.ts
│   │   │   ├── upload.ts
│   │   │   ├── twitter.ts
│   │   │   └── linkedin.ts
│   │   ├── services/        # Business logic services
│   │   │   ├── geminiService.ts
│   │   │   ├── imageGenerationService.ts
│   │   │   ├── twitterService.ts
│   │   │   └── linkedinService.ts
│   │   ├── middleware/      # Express middleware
│   │   │   ├── auth.ts
│   │   │   └── errorHandler.ts
│   │   ├── utils/           # Utility functions
│   │   │   ├── jwt.ts
│   │   │   └── imageStorage.ts
│   │   ├── types/           # TypeScript types
│   │   │   └── index.ts
│   │   └── index.ts          # Entry point
│   └── package.json
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v20.x or higher recommended, v18.16.1 minimum)
  - The `pdf-parse` library used for file extraction requires Node.js 20+ for optimal compatibility
  - Using Node.js 18 may cause `DOMMatrix is not defined` errors (see [Troubleshooting](#troubleshooting))
- npm or yarn
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Melo
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```
   
   This will install all frontend dependencies including React, Ant Design, and routing libraries.

4. **Set up environment variables**
   
   Create a `.env` file in the `backend/` directory (see Environment Variables section below for required variables).
   
   **Important**: Make sure to add Twitter and LinkedIn API credentials:

   ```env
   # Twitter/X OAuth (Required for Twitter integration)
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret
   TWITTER_CALLBACK_URL=http://localhost:5000/api/twitter/callback
   
   # LinkedIn API (Required for LinkedIn integration)
   LI_CLIENT_ID=your_linkedin_client_id
   LI_CLIENT_SECRET=your_linkedin_client_secret
   LI_REDIRECT_URI=http://localhost:5000/linkedin/callback
   CLIENT_URL=http://localhost:3000
   ```

### Running the Application

1. **Start MongoDB** (if running locally)

   ```bash
   # Make sure MongoDB is running on localhost:27017
   # Or update MONGODB_URI in backend/.env
   ```

2. **Start the backend server**

   ```bash
   cd backend
   npm run dev
   # Server runs on http://localhost:5000
   ```

3. **Start the frontend development server**

   ```bash
   cd frontend
   npm run dev
   # Frontend runs on http://localhost:3000
   ```

4. **Open your browser**
   - Navigate to `http://localhost:3000`

## 🔐 Environment Variables

### Backend (.env)

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/melo
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
GOOGLE_CLIENT_ID=438863330302-odum2gjdipe9hc4v257aj4lkvr100d32.apps.googleusercontent.com

# Twitter/X OAuth Credentials (Required for Twitter integration)
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_CALLBACK_URL=http://localhost:5000/api/twitter/callback
# Optional: Backend URL (defaults to http://localhost:5000)
BACKEND_URL=http://localhost:5000

# LinkedIn API Credentials (Required for LinkedIn integration)
LI_CLIENT_ID=your_linkedin_client_id
LI_CLIENT_SECRET=your_linkedin_client_secret
LI_REDIRECT_URI=http://localhost:5000/linkedin/callback
CLIENT_URL=http://localhost:3000
```

**Note**:

- Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/)
- `GEMINI_IMAGE_MODEL` is optional, defaults to `gemini-2.5-flash-image` if not set
- Make sure the `backend/uploads/images/` directory exists for image storage
- **Twitter/X OAuth credentials** can be obtained from the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
  - Create a Twitter app and get your API Key and API Secret
  - Set the callback URL to match `TWITTER_CALLBACK_URL` in your `.env` file
  - Enable OAuth 1.0a authentication in your app settings
- **LinkedIn API credentials** can be obtained from the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
  - Create a LinkedIn app and get your Client ID and Client Secret
  - Set the redirect URI to match `LI_REDIRECT_URI` in your `.env` file
  - Enable required products: "Sign In with LinkedIn using OpenID Connect" and "Share on LinkedIn"

### Frontend

The frontend uses Vite's proxy configuration (see `frontend/vite.config.ts`) to proxy API requests to the backend.

### Frontend(.env)

```env
VITE_BACKEND_PORT=5000
VITE_GOOGLE_CLIENT_ID=438863330302-odum2gjdipe9hc4v257aj4lkvr100d32.apps.googleusercontent.com
# Optional: Set VITE_API_URL if not using vite proxy (default: empty string uses proxy)
# VITE_API_URL=http://localhost:5000
```

### LinkedIn Integration (.env)

For LinkedIn integration, add the following to `backend/.env`:

```env
# LinkedIn API Configuration
LI_CLIENT_ID=your_linkedin_client_id
LI_CLIENT_SECRET=your_linkedin_client_secret
LI_REDIRECT_URI=http://localhost:5000/linkedin/callback
CLIENT_URL=http://localhost:3000
```

**Note**:

- Get your LinkedIn credentials from [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
- `LI_REDIRECT_URI` must match exactly what you set in LinkedIn Developer Portal
- `CLIENT_URL` must match your frontend URL (default: `http://localhost:3000`)

### Twitter/X Integration (.env)

For Twitter/X OAuth integration, add the following to `backend/.env`:

```env
# Twitter/X OAuth Configuration
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_CALLBACK_URL=http://localhost:5000/api/twitter/callback
BACKEND_URL=http://localhost:5000
CLIENT_URL=http://localhost:3000
```

**Note**:

- Get your Twitter credentials from [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
- `TWITTER_CALLBACK_URL` must match exactly what you set in Twitter Developer Portal
- `CLIENT_URL` must match your frontend URL (default: `http://localhost:3000`)

## 🐦 Twitter/X Integration

### Overview

The Twitter/X integration allows users to connect their Twitter accounts via OAuth 1.0a and share content directly to their Twitter profiles. Each user can connect their own Twitter account, and the platform will use their credentials for posting.

### Features

- **OAuth 1.0a Authentication**: Secure user authentication flow
- **User-Specific Tokens**: Each user connects their own Twitter account
- **Direct Posting**: Share calendar items directly to Twitter/X
- **Connection Management**: Connect and disconnect Twitter accounts from the Social Dashboard

### Twitter Setup

#### Quick Setup Steps

1. **Configure Environment Variables** (in `backend/.env`):

   ```env
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret
   TWITTER_CALLBACK_URL=http://localhost:5000/api/twitter/callback
   BACKEND_URL=http://localhost:5000
   CLIENT_URL=http://localhost:3000
   ```

2. **Configure Twitter Developer Portal**:

   - Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Create a new app or select an existing app
   - Go to **"Keys and tokens"** tab → Copy your **API Key** and **API Secret**
   - Go to **"App settings"** → **"User authentication settings"**
   - Enable **OAuth 1.0a**
   - Set **Callback URI / Redirect URL** to: `http://localhost:5000/api/twitter/callback`
   - Set **App permissions** to: **Read and write** (required for posting tweets)
   - Save the changes

3. **Test the Connection**:
   - Navigate to `http://localhost:3000/socialdashboard`
   - Click "Connect Twitter" button
   - Should redirect to Twitter authorization page
   - After authorization, you'll be redirected back to the dashboard

#### How It Works

1. **User Initiates Connection**: User clicks "Connect Twitter" button in Social Dashboard
2. **OAuth Flow**: User is redirected to Twitter to authorize the application
3. **Token Storage**: Twitter access tokens are stored securely in MongoDB (`TwitterToken` collection)
4. **Posting Content**: When sharing calendar items, the system uses the user's stored tokens to post to their Twitter account

#### Common Issues & Solutions

| Issue                                        | Solution                                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| "Twitter API credentials are not configured" | Ensure `TWITTER_API_KEY` and `TWITTER_API_SECRET` are set in `backend/.env`            |
| "Callback URL not approved"                  | Verify callback URL in Twitter Developer Portal matches `TWITTER_CALLBACK_URL` exactly |
| "Invalid request token"                      | Request tokens expire after 10 minutes. Try connecting again                           |
| "Twitter account not connected"              | User must connect their Twitter account before sharing content                         |
| Button doesn't redirect                      | Ensure user is logged in, check backend is running                                     |

#### Debugging

- **Check backend logs**: Should see `Generating Twitter OAuth link with callback URL: ...` when clicking button
- **Check browser console** (F12): Look for errors in Console and Network tabs
- **Verify environment variables**:
  ```bash
  cd backend && cat .env | grep TWITTER_
  ```
- **Verify services**: Backend on port 5000, Frontend on port 3000
- **Check MongoDB**: Verify `TwitterToken` collection exists and contains user tokens

#### API Endpoints

- `GET /api/twitter/auth?userId=<userId>` - Initiate OAuth flow
- `GET /api/twitter/callback` - Handle OAuth callback
- `GET /api/twitter/status` - Check connection status (requires authentication)
- `DELETE /api/twitter/disconnect` - Disconnect Twitter account (requires authentication)

## 🔗 LinkedIn Integration

### Overview

The LinkedIn integration allows users to connect their LinkedIn accounts and manage LinkedIn posts, events, comments, and reactions directly from the Melo platform.

### LinkedIn Connect Button Fix

**Issue**: The "Connect LinkedIn" button was not redirecting properly when clicked.

**Root Cause**: The button was using the `href` attribute, which would redirect to `"#"` when `authUrl` was `undefined`, preventing proper navigation to the LinkedIn OAuth page.

**Solution**:

1. **Replaced `href` with `onClick` handler**: Changed both Connect LinkedIn buttons (main button and metrics card button) from using `href={authUrl || "#"}` to using an `onClick` event handler.
2. **Implemented proper redirect logic**: Used `window.location.href = authUrl` within the `onClick` handler to ensure reliable navigation.
3. **Added error handling**: Included validation to check if `authUrl` exists before attempting redirect, with user-friendly error messages.

**Code Changes**:

```tsx
// Before (Not Working)
<Button href={authUrl || "#"} disabled={!authUrl}>
  Connect LinkedIn
</Button>

// After (Fixed)
<Button
  disabled={!authUrl}
  onClick={() => {
    if (!authUrl) {
      console.error("Cannot connect: userId not available");
      alert("Please wait for user data to load, or try refreshing the page.");
      return;
    }
    // Redirect to LinkedIn OAuth
    window.location.href = authUrl;
  }}
>
  Connect LinkedIn
</Button>
```

**Files Modified**:

- `frontend/src/components/LinkedInDashboard.tsx` - Fixed both Connect LinkedIn buttons

**Why This Works**:

- `onClick` handlers provide better control over navigation behavior
- `window.location.href` ensures a full page navigation, which is required for OAuth flows
- Error handling prevents silent failures and provides user feedback
- The approach is consistent with OAuth best practices for redirect-based authentication

### LinkedIn Setup

#### Quick Setup Steps

1. **Configure Environment Variables** (in `backend/.env`):

   ```env
   LI_CLIENT_ID=your_linkedin_client_id
   LI_CLIENT_SECRET=your_linkedin_client_secret
   LI_REDIRECT_URI=http://localhost:5000/linkedin/callback
   CLIENT_URL=http://localhost:3000
   ```

2. **Configure LinkedIn Developer Portal**:

   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps)
   - Select your app → **"Auth"** tab → Add redirect URI: `http://localhost:5000/linkedin/callback`
   - Go to **"Products"** tab → Enable:
     - ✅ Sign In with LinkedIn using OpenID Connect
     - ✅ Share on LinkedIn

3. **Test the Connection**:
   - Navigate to `http://localhost:3000/socialdashboard`
   - Click "Connect LinkedIn" button
   - Should redirect to LinkedIn authorization page

#### Common Issues & Solutions

| Issue                      | Solution                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| Button doesn't redirect    | Ensure user is logged in, check backend is running                                                        |
| "Invalid redirect_uri"     | Verify redirect URI in LinkedIn app matches `LI_REDIRECT_URI` exactly                                     |
| "Not enough permissions"   | Enable required products in LinkedIn Developer Portal                                                     |
| Blank page after redirect  | Check `CLIENT_URL` matches your frontend URL                                                              |
| `DOMMatrix is not defined` | Upgrade to Node.js 20+ or ensure `@napi-rs/canvas` is installed (see [Troubleshooting](#troubleshooting)) |

#### Debugging

- **Check backend logs**: Should see `LinkedIn OAuth redirect URL: ...` when clicking button
- **Check browser console** (F12): Look for errors in Console and Network tabs
- **Verify environment variables**:
  ```bash
  cd backend && cat .env | grep LI_
  ```
- **Verify services**: Backend on port 5000, Frontend on port 3000

## 🔧 Troubleshooting

### DOMMatrix is not defined Error

**Error Message:**

```
ReferenceError: DOMMatrix is not defined
```

**Cause:**
This error occurs when using the `pdf-parse` library in Node.js environments. The `pdf-parse` library requires `DOMMatrix`, which is a browser API that needs to be polyfilled in Node.js. The `@napi-rs/canvas` package provides this polyfill, but it may not be properly installed or your Node.js version may be incompatible.

**Solutions:**

1. **Upgrade Node.js (Recommended)**

   - Upgrade to Node.js 20.x or higher for best compatibility
   - The `pdf-parse` library and its dependencies work best with Node.js 20+

2. **Ensure Dependencies are Installed**

   ```bash
   cd backend
   npm install
   ```

   This should automatically install `@napi-rs/canvas` as a dependency of `pdf-parse`.

3. **Reinstall pdf-parse (if issue persists)**

   ```bash
   cd backend
   npm uninstall pdf-parse
   npm install pdf-parse@^2.4.5
   ```

4. **Verify Installation**
   ```bash
   npm list @napi-rs/canvas
   ```
   You should see `@napi-rs/canvas` listed as a dependency of `pdf-parse`.

**Note:** This error typically occurs when processing PDF files through the file upload feature. If you're not using PDF file extraction, you may not encounter this issue.

### VS Code Terminal Launch Issues

If you're experiencing issues with the Integrated Terminal in VS Code (or Cursor), here are common solutions:

**Error: Terminal failed to launch**

1. **Check VS Code Settings**

   - Open Settings (File > Preferences > Settings)
   - Search for `terminal.integrated` settings
   - Verify your default shell profile is correctly configured
   - On macOS/Linux, ensure the shell path is correct (e.g., `/bin/zsh`, `/bin/bash`)

2. **Test Your Shell Directly**

   - Try running your shell outside VS Code/Cursor
   - Some terminal launch failures are due to shell installation issues, not the editor

3. **Update VS Code/Cursor**

   - Ensure you're using the latest version
   - Each release includes terminal improvements and bug fixes

4. **Check Node.js Version**

   - Verify Node.js is installed and accessible: `node --version`
   - Ensure Node.js is in your system PATH

5. **Common Exit Codes**

   - **Exit code 1**: Usually indicates a shell configuration issue
   - **Exit code 259 (Windows)**: Process is still active, try killing unused processes
   - Search online for your specific shell and exit code for targeted solutions

6. **macOS Specific**

   - Ensure your shell has proper permissions
   - Check if your shell is in `/etc/shells` (for non-standard shells)

7. **Reinstall Dependencies**
   ```bash
   # Clean install
   rm -rf node_modules package-lock.json
   npm install
   ```

**For more detailed troubleshooting**, refer to the [VS Code Terminal Troubleshooting Guide](https://aka.ms/vscode-troubleshoot-terminal-launch).

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

Most endpoints require JWT authentication. Include the token in the request header:

```
Authorization: Bearer <token>
```

---

### General Endpoints

#### 1. Health Check

**GET** `/api/health`

Check server running status.

**Response:**

```json
{
  "status": "ok",
  "message": "Server is running"
}
```

#### 2. API Welcome

**GET** `/api`

Get API welcome message.

**Response:**

```json
{
  "message": "Welcome to Melo API"
}
```

---

### Authentication Endpoints

#### 1. Register User

**POST** `/api/auth/register`

Register a new user account.

**Access:** Public

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400` - Missing email/password or user already exists
- `500` - Server error

---

#### 2. Login User

**POST** `/api/auth/login`

Authenticate user and get access token.

**Access:** Public

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**

- `400` - Missing email/password
- `401` - Invalid credentials
- `500` - Server error

---

#### 3. Get Current User

**GET** `/api/auth/me`

Get current authenticated user information.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `401` - Not authorized
- `404` - User not found
- `500` - Server error

---

#### 4. Logout User

**POST** `/api/auth/logout`

Logout user (client should remove token).

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Responses:**

- `401` - Not authorized

---

### Chat Endpoints

#### 1. Send Chat Message

**POST** `/api/chat`

Send a message to the AI chat and receive a response based on user's Brand Profile. Automatically manages conversation history.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "message": "What marketing strategies work best for my brand?",
  "conversationId": "optional_conversation_id"
}
```

**Note:**

- `conversationId` is optional. If provided, the message will be added to the existing conversation. If not provided, a new conversation will be created.
- The API automatically maintains conversation history based on the conversation ID.

**Success Response (200):**

```json
{
  "success": true,
  "response": "Based on your brand profile, I recommend focusing on...",
  "conversationId": "507f1f77bcf86cd799439011"
}
```

**Error Responses:**

- `400` - Message is required
- `401` - Not authorized
- `404` - User not found or conversation not found
- `500` - Server error or Gemini API error

---

#### 2. Generate Image

**POST** `/api/chat/generate-image`

Generate an image using AI based on a text prompt.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "prompt": "a cute little rabbit on the grass",
  "conversationId": "optional_conversation_id"
}
```

**Note:**

- `prompt` is required - the text description of the image to generate
- `conversationId` is optional. If provided, the generated image will be added to the conversation. If not, a new conversation will be created.

**Success Response (200):**

```json
{
  "success": true,
  "imageUrl": "/uploads/images/1764196856532-ui9irxyi45.png",
  "images": ["/uploads/images/1764196856532-ui9irxyi45.png"],
  "conversationId": "507f1f77bcf86cd799439011"
}
```

**Error Responses:**

- `400` - Prompt is required
- `401` - Not authorized
- `404` - User not found
- `500` - Server error or image generation failed

---

#### 3. Get All Conversations

**GET** `/api/chat`

Get all conversations for the current user, sorted by most recent.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "conversations": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Marketing strategies",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `401` - Not authorized
- `404` - User not found
- `500` - Server error

---

#### 4. Get Single Conversation

**GET** `/api/chat/:conversationId`

Get a specific conversation with all its messages.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "conversation": {
    "id": "507f1f77bcf86cd799439011",
    "title": "Marketing strategies",
    "messages": [
      {
        "role": "user",
        "content": "Hello",
        "images": null,
        "timestamp": "2024-01-01T00:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Hello! How can I help you?",
        "images": null,
        "timestamp": "2024-01-01T00:01:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Generated image: a cute rabbit",
        "images": ["/uploads/images/1764196856532-ui9irxyi45.png"],
        "timestamp": "2024-01-01T00:02:00.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:02:00.000Z"
  }
}
```

**Error Responses:**

- `401` - Not authorized
- `404` - User not found or conversation not found
- `500` - Server error

---

#### 5. Delete Conversation

**DELETE** `/api/chat/:conversationId`

Delete a specific conversation.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Conversation deleted successfully"
}
```

**Error Responses:**

- `401` - Not authorized
- `404` - User not found or conversation not found
- `500` - Server error

---

### Upload Endpoints

#### 1. Upload Image (Multipart)

**POST** `/api/upload/image`

Upload an image file using multipart/form-data.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**

- `image`: Image file (multipart/form-data)

**Note:**

- Only image files are allowed
- Maximum file size: 10MB
- Supported formats: All image types (JPEG, PNG, etc.)

**Success Response (200):**

```json
{
  "success": true,
  "imageUrl": "/uploads/images/1764196856532-abc123.jpg"
}
```

**Error Responses:**

- `400` - No image file provided or invalid file type
- `401` - Not authorized
- `404` - User not found
- `500` - Server error or upload failed

---

#### 2. Upload Image (Base64)

**POST** `/api/upload/image-base64`

Upload an image using base64 encoded data.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "imageData": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "mimeType": "image/png"
}
```

**Note:**

- `imageData` is required - base64 encoded image data (with or without data URL prefix)
- `mimeType` is optional - defaults to 'image/png' if not provided

**Success Response (200):**

```json
{
  "success": true,
  "imageUrl": "/uploads/images/1764196856532-abc123.png"
}
```

**Error Responses:**

- `400` - Image data is required
- `401` - Not authorized
- `404` - User not found
- `500` - Server error or upload failed

---

### Calendar Endpoints

#### 1. Get Calendar Items

**GET** `/api/calendar`

Get calendar items for a date range.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
```

**Query Parameters:**

- `startDate` (required) - Start date in YYYY-MM-DD format
- `endDate` (required) - End date in YYYY-MM-DD format

**Success Response (200):**

```json
{
  "success": true,
  "items": [
    {
      "id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "campaignId": "507f1f77bcf86cd799439013",
      "campaignName": "Summer Sale",
      "platform": "instagram_post",
      "date": "2024-01-01",
      "time": "10:00",
      "title": "New Product Launch",
      "content": "Check out our new product!",
      "imageUrl": "/uploads/images/1764196856532-abc123.jpg",
      "variants": {},
      "status": "draft",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- `400` - Missing startDate or endDate
- `401` - Not authorized
- `404` - User not found
- `500` - Server error

---

#### 2. Get Single Calendar Item

**GET** `/api/calendar/:id`

Get a specific calendar item by ID.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "item": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "campaignId": "507f1f77bcf86cd799439013",
    "campaignName": "Summer Sale",
    "platform": "instagram_post",
    "date": "2024-01-01",
    "time": "10:00",
    "title": "New Product Launch",
    "content": "Check out our new product!",
    "imageUrl": "/uploads/images/1764196856532-abc123.jpg",
    "variants": {},
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `401` - Not authorized
- `404` - User not found or calendar item not found
- `500` - Server error

---

#### 3. Create Calendar Item

**POST** `/api/calendar`

Create a new calendar item.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "platform": "instagram_post",
  "date": "2024-01-01",
  "time": "10:00",
  "title": "New Product Launch",
  "content": "Check out our new product!",
  "imageUrl": "/uploads/images/1764196856532-abc123.jpg",
  "status": "draft",
  "campaignId": "507f1f77bcf86cd799439013",
  "variants": {
    "tiktok": "TikTok variant content",
    "facebook": "Facebook variant content"
  }
}
```

**Note:**

- `platform`, `date`, `title`, and `content` are required
- `imageUrl` is optional
- Supported platforms: `instagram_post`, `instagram_story`, `instagram_reels`, `tiktok`, `facebook`, `twitter`, `linkedin`
- `status` defaults to `'draft'` if not provided

**Success Response (201):**

```json
{
  "success": true,
  "item": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "campaignId": "507f1f77bcf86cd799439013",
    "platform": "instagram_post",
    "date": "2024-01-01",
    "time": "10:00",
    "title": "New Product Launch",
    "content": "Check out our new product!",
    "imageUrl": "/uploads/images/1764196856532-abc123.jpg",
    "variants": {},
    "status": "draft",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `400` - Missing required fields
- `401` - Not authorized
- `404` - User not found
- `500` - Server error

---

#### 4. Update Calendar Item

**PUT** `/api/calendar/:id`

Update an existing calendar item.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "platform": "instagram_post",
  "date": "2024-01-02",
  "time": "11:00",
  "title": "Updated Title",
  "content": "Updated content",
  "imageUrl": "/uploads/images/1764196856532-xyz789.jpg",
  "status": "scheduled"
}
```

**Note:**

- All fields are optional - only provided fields will be updated
- User can only update their own calendar items

**Success Response (200):**

```json
{
  "success": true,
  "item": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "507f1f77bcf86cd799439012",
    "campaignId": "507f1f77bcf86cd799439013",
    "platform": "instagram_post",
    "date": "2024-01-02",
    "time": "11:00",
    "title": "Updated Title",
    "content": "Updated content",
    "imageUrl": "/uploads/images/1764196856532-xyz789.jpg",
    "variants": {},
    "status": "scheduled",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Responses:**

- `401` - Not authorized
- `404` - User not found or calendar item not found
- `500` - Server error

---

#### 5. Delete Calendar Item

**DELETE** `/api/calendar/:id`

Delete a calendar item.

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Calendar item deleted successfully"
}
```

**Error Responses:**

- `401` - Not authorized
- `404` - User not found or calendar item not found
- `500` - Server error

---

#### 6. Share Calendar Item

**POST** `/api/calendar/:id/share`

Share a calendar item to a social media platform (currently supports Twitter/X).

**Access:** Private (Requires authentication)

**Request Headers:**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "platform": "twitter"
}
```

**Note:**

- `platform` is required - currently only `"twitter"` is supported
- User must have connected their Twitter account before sharing
- The calendar item's content and image (if available) will be posted to the user's Twitter account

**Success Response (200):**

```json
{
  "success": true,
  "message": "Calendar item shared to Twitter successfully",
  "tweetId": "1234567890123456789"
}
```

**Error Responses:**

- `400` - Platform is required, or platform not supported, or Twitter account not connected
- `401` - Not authorized
- `404` - User not found or calendar item not found
- `500` - Server error or Twitter API error

---

## 📊 Data Models

### User

```typescript
{
  id: string                    // MongoDB ObjectId (as string)
  email: string                 // User email (unique, lowercase)
  password: string              // Password (plain text for demo)
  name?: string                 // User's name
  brandName?: string            // Brand name
  industry?: string             // Industry
  toneOfVoice?: string          // Brand tone of voice
  knowledgeProducts?: string[]  // Knowledge base products
  targetAudience?: string[]     // Target audience
  createdAt: string            // ISO 8601 timestamp
  updatedAt: string            // ISO 8601 timestamp
}
```

### Conversation

```typescript
{
  id: string                    // MongoDB ObjectId (as string)
  userId: string               // Reference to User
  title: string                // Conversation title (auto-generated)
  messages: ConversationMessage[] // Array of messages
  createdAt: string           // ISO 8601 timestamp
  updatedAt: string           // ISO 8601 timestamp
}
```

### ConversationMessage

```typescript
{
  role: 'user' | 'assistant'   // Message role
  content: string              // Message text content
  images?: string[]            // Optional array of image URLs
  timestamp: string           // ISO 8601 timestamp
}
```

### AuthResponse

```typescript
{
  success: boolean     // Request success status
  token?: string      // JWT token (on login/register)
  user?: User         // User information
  message?: string    // Error message
}
```

### ChatResponse

```typescript
{
  success: boolean           // Request success status
  response?: string         // AI response text
  conversationId?: string   // Conversation ID
  message?: string          // Error message
}
```

### ImageGenerationResponse

```typescript
{
  success: boolean           // Request success status
  imageUrl?: string          // Generated image URL
  images?: string[]          // Array of image URLs
  conversationId?: string    // Conversation ID
  message?: string          // Error message
}
```

### CalendarItem

```typescript
{
  id: string                    // MongoDB ObjectId (as string)
  userId: string               // Reference to User
  campaignId?: string | null   // Reference to Campaign (optional)
  campaignName?: string | null // Campaign name (populated)
  platform: string            // Platform: 'instagram_post', 'instagram_story', 'instagram_reels', 'tiktok', 'facebook'
  date: string                // Date in YYYY-MM-DD format
  time?: string | null        // Time in HH:mm format (optional)
  title: string               // Calendar item title
  content: string             // Main content text
  imageUrl?: string | null    // Image URL (optional)
  variants?: CalendarItemVariants // Platform-specific content variants
  status: 'draft' | 'scheduled' | 'published' // Item status
  createdAt: string          // ISO 8601 timestamp
  updatedAt: string          // ISO 8601 timestamp
}
```

### CalendarItemVariants

```typescript
{
  tiktok?: string              // TikTok-specific content variant
  instagram_post?: string  // Instagram Post variant
  instagram_story?: string // Instagram Story variant
  instagram_reels?: string // Instagram Reels variant
  facebook?: string        // Facebook-specific content variant
}
```

### UploadImageResponse

```typescript
{
  success: boolean     // Request success status
  imageUrl?: string    // Uploaded image URL
  message?: string     // Error message
}
```

---

## 🔄 Authentication Flow

1. **Register/Login**: User calls `/api/auth/register` or `/api/auth/login`
2. **Receive Token**: Backend returns JWT token in response
3. **Store Token**: Frontend saves token to `localStorage`
4. **Authenticated Requests**: Include `Authorization: Bearer <token>` header
5. **Token Validation**: Backend middleware validates token on protected routes
6. **Logout**: Call `/api/auth/logout` and remove token from `localStorage`

---

## 💻 Development

### Backend Development

```bash
cd backend
npm run dev    # Start with hot reload (tsx watch)
npm run build  # Build for production
npm start      # Run production build
```

### Frontend Development

```bash
cd frontend
npm run dev    # Start dev server
npm run build  # Build for production
npm run preview # Preview production build
```

### Code Structure

- **Components**: Reusable UI components in `frontend/src/components/`
- **Pages**: Route-level components in `frontend/src/pages/`
- **Services**: API service layer in `frontend/src/services/`
- **Routes**: API endpoints in `backend/src/routes/`
- **Middleware**: Express middleware in `backend/src/middleware/`
- **Models**: Database models in `backend/src/models/`

---

## 🌙 Dark Mode Implementation

### Color Palette

Dark mode uses a gray-scale color scheme for consistent theming:

- **Deep Gray**: `#1b1c1e` - Primary background
- **Dark Gray**: `#1f1f1f` - Secondary background
- **Gray**: `#2b2b2b` - Card/surface background
- **Light Gray**: `#303030` - Border and divider

### Implementation Steps

1. **Add dark mode toggle** in App Settings (Settings → Theme Mode)
2. **Apply CSS variables** for dark theme colors
3. **Override Ant Design components** with dark backgrounds
4. **Exclude entry pages** (home, privacy, terms, contact) from dark mode
5. **Update logo styling** for dark header compatibility

### CSS Variable Mapping

```css
html.dark-mode-active {
  --bg-primary: #1b1c1e;
  --bg-secondary: #1f1f1f;
  --card-bg: #2b2b2b;
  --border-color: #303030;
  --text-primary: #e8edf5;
  --text-secondary: #b6c2d1;
}
```

---

## 🔒 Security Notes

⚠️ **Important**: This project currently stores passwords in **plain text** for demonstration purposes only.

**For production:**

- Implement password hashing (bcrypt)
- Use HTTPS
- Add rate limiting
- Implement proper input validation
- Add CORS restrictions
- Use environment variables for secrets
- Implement file upload size limits
- Add image validation and sanitization
- Consider using cloud storage (AWS S3, Google Cloud Storage) instead of local file system

---

## 📝 HTTP Status Codes

| Code | Description           |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 404  | Not Found             |
| 500  | Internal Server Error |

---

## 🧪 Testing

### Test Authentication Flow

1. Register a new user via `/api/auth/register`
2. Login with credentials via `/api/auth/login`
3. Use the returned token to access `/api/auth/me`
4. Logout via `/api/auth/logout`

### Frontend Testing

The frontend automatically handles:

- Token storage in `localStorage`
- Token inclusion in authenticated requests
- Automatic token validation on app load
- Login state management across components
- Conversation history management
- Image generation and display

### Image Generation Testing

1. Login to the application
2. Click the image icon in the chat toolbar
3. Enter a prompt (e.g., "a cute little rabbit on the grass")
4. Click "Generate" or press Ctrl+Enter / Cmd+Enter
5. The generated image should appear in the chat
6. Images are saved to `backend/uploads/images/` directory

### Image Upload Testing

1. **File Upload (Multipart)**:

   - Create or edit a calendar item
   - Click "Upload Image" button
   - Select an image file from your computer
   - The image should be uploaded and displayed in the calendar item
   - Image URL will be saved with the calendar item

2. **Base64 Upload**:

   - Use the upload service to convert a file to base64
   - Send base64 data to `/api/upload/image-base64`
   - Verify the image URL is returned and saved

3. **AI Generate Image for Calendar Item**:
   - Create or edit a calendar item
   - Enter content text
   - Click "AI Generate (Auto)" to automatically generate an image based on content
   - Or click "AI Generate (Manual)" to enter a custom prompt
   - Generated image will be saved to the calendar item

### Calendar Item Testing

1. **Create Calendar Item**:

   - Navigate to the Calendar page
   - Click the "+" button or select a date
   - Fill in platform, date, title, and content
   - Optionally upload or generate an image
   - Select status (draft, scheduled, published)
   - Save the calendar item

2. **View Calendar Items**:

   - Calendar items are displayed on the calendar grid
   - Click on a calendar item to view details
   - Images are displayed in the item details modal

3. **Update Calendar Item**:

   - Click on an existing calendar item
   - Click "Edit" button
   - Modify fields including image
   - Save changes

4. **Delete Calendar Item**:
   - Open calendar item details
   - Click "Delete" button
   - Confirm deletion

---

## 📄 License

[Add your license here]

---

## 👥 Contributors

[Add contributors here]

---

## 📞 Support

For issues and questions, please open an issue in the repository.
