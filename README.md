# Screen Recording Windowless

A cross-platform Electron application for automatic screen recording and secure upload, with user authentication and settings management.

---

## Features

- **User Authentication:** Login with username and password; token securely stored using `electron-store`.
- **Screen Recording:** Start and stop desktop recordings, with audio and video, using Electron and the MediaRecorder API.
- **Automatic Upload:** Recordings are automatically uploaded to a configured server endpoint after completion.
- **Settings Page:** Configure and save API endpoints (login and upload) via a dedicated settings page.
- **Recording Duration:** Displays and logs the duration of the last recording.
- **Modern UI:** Clean, responsive interface using Bootstrap.
- **Custom Save Location:** Recordings are saved in a `screen-recorder` folder on the user's Desktop by default.
- **Menu Navigation:** Easily switch between Home and Settings from the app menu.
- **Developer Tools:** Toggle DevTools from the menu for debugging.

---

## Environment Variables

You can configure the login endpoint using an environment variable. Create a `.env` file in your project root (or use the sample below):

```env
# The login endpoint for user authentication
LOGIN_URL=http://localhost:3000/api/auth/signin
```

If not set, the app will use the value from settings or fall back to the default.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)

### Clone the Repository

```sh
git clone https://github.com/your-username/screen-recording.git
cd screen-recording
```

### Install Dependencies

This project uses [SweetAlert2](https://sweetalert2.github.io/) for modern confirmation dialogs (e.g., when deleting a recording). Install it with:

```sh
npm install sweetalert2
```

---

## Usage

### Start the App (Development)

```sh
npm start
```

### Build for Production

```sh
npm run build
```

Or for a specific platform:

```sh
npm run build-window
npm run build-mac
npm run build-linux
```

---

## Project Structure

```
screen-recording/
├── index.html           # Home/login page
├── settings.html        # Settings page for API endpoints
├── main.js              # Electron main process (window, menu, IPC, server)
├── preload.js           # Secure context bridge for renderer <-> main
├── renderer.js          # Renderer process (UI logic, recording, login)
├── server.js            # Express server for REST API and upload logic
├── src/
│   ├── recorder.js      # (Optional) Additional recording logic
│   └── server.js        # (Optional) Additional server logic
├── package.json
└── ...
```

---

## Configuration

- **API Endpoints:**  
  Set the login and upload endpoints via the Settings page (accessible from the menu).
- **Recording Save Path:**  
  By default, recordings are saved to `~/Desktop/screen-recorder/`. You can override this by providing a path in the recording options.

---

## Key Features & How They Work

### Authentication

- Login form on the home page.
- Credentials are sent to the configured login endpoint.
- On success, the token is stored securely using `electron-store`.

### Screen Recording

- Uses Electron’s desktopCapturer and MediaRecorder API.
- Records both video and audio (if available).
- Filename and path are auto-generated if not provided.

### Upload

- After recording, the file is uploaded to the configured server.
- The upload includes metadata: interactionId, token, and recording duration.

### Settings

- Accessible from the menu.
- Allows you to set and save API endpoints for login and upload.

### Developer Tools

- Toggle DevTools from the "Debug" menu or with `Ctrl+Shift+I`.

### Modern Confirmation Dialogs

- When deleting a recording, the app uses SweetAlert2 for a user-friendly confirmation dialog instead of the default browser `window.confirm`.
- This provides a more attractive and consistent user experience.

---

## Security

- Tokens and settings are stored securely using `electron-store`.
- Context isolation is enabled for the renderer process.

---

## Customization

- **UI:**  
  Uses Bootstrap for a modern look. You can further customize styles in the `<style>` blocks of `index.html` and `settings.html`.
- **Endpoints:**  
  Easily changeable via the Settings page.

---

## Troubleshooting

- **DevTools not opening:**  
  Use the "Debug" menu or `Ctrl+Shift+I`.
- **Recording not saving:**  
  Ensure the `screen-recorder` folder exists on your Desktop, or check permissions.
- **Upload issues:**  
  Check the server endpoint configuration in Settings.

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

[MIT](LICENSE)

---

## Author

Stephen Akinbobola 