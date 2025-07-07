const { app, BrowserWindow, Menu } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const isDev = require("electron-is-dev");
const url = require("url");

// Référence à la fenêtre principale
let mainWindow;
// Référence au processus du serveur Next.js
let nextApp;
// Port sur lequel le serveur Next.js s'exécute
const port = 3000;

// Fonction pour créer la fenêtre principale
function createWindow() {
  // Créer la fenêtre du navigateur
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "../public/favicon.ico"),
    title: "Gestion Ateliers EPN",
  });

  // Définir le menu de l'application
  const template = [
    {
      label: "Fichier",
      submenu: [{ role: "quit", label: "Quitter" }],
    },
    {
      label: "Édition",
      submenu: [
        { role: "undo", label: "Annuler" },
        { role: "redo", label: "Rétablir" },
        { type: "separator" },
        { role: "cut", label: "Couper" },
        { role: "copy", label: "Copier" },
        { role: "paste", label: "Coller" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Actualiser" },
        { role: "forceReload", label: "Forcer l'actualisation" },
        { role: "toggleDevTools", label: "Outils de développement" },
        { type: "separator" },
        { role: "resetZoom", label: "Taille réelle" },
        { role: "zoomIn", label: "Zoom avant" },
        { role: "zoomOut", label: "Zoom arrière" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein écran" },
      ],
    },
    {
      label: "Aide",
      submenu: [
        {
          label: "À propos",
          click: () => {
            const aboutWindow = new BrowserWindow({
              width: 400,
              height: 300,
              parent: mainWindow,
              modal: true,
              show: false,
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
              },
            });
            aboutWindow.loadURL(
              url.format({
                pathname: path.join(__dirname, "about.html"),
                protocol: "file:",
                slashes: true,
              })
            );
            aboutWindow.once("ready-to-show", () => {
              aboutWindow.show();
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // En mode développement, démarrer le serveur Next.js
  if (isDev) {
    console.log("Démarrage du serveur Next.js en mode développement...");
    const nextDir = path.join(__dirname, "..");
    nextApp = spawn("npm", ["run", "dev"], { cwd: nextDir, shell: true });

    nextApp.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    nextApp.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    nextApp.on("close", (code) => {
      console.log(`Le processus Next.js s'est terminé avec le code ${code}`);
    });

    // Attendre que le serveur démarre avant de charger l'URL
    setTimeout(() => {
      mainWindow.loadURL(`http://localhost:${port}`);
      // Ouvrir les outils de développement en mode dev
      mainWindow.webContents.openDevTools();
    }, 5000);
  } else {
    // En production, utiliser le serveur Next.js intégré
    console.log("Démarrage du serveur Next.js en mode production...");
    const nextDir = path.join(__dirname, "..");
    nextApp = spawn("npm", ["run", "start"], { cwd: nextDir, shell: true });

    nextApp.stdout.on("data", (data) => {
      console.log(`stdout: ${data}`);
    });

    nextApp.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });

    nextApp.on("close", (code) => {
      console.log(`Le processus Next.js s'est terminé avec le code ${code}`);
    });

    // Attendre que le serveur démarre avant de charger l'URL
    setTimeout(() => {
      mainWindow.loadURL(`http://localhost:${port}`);
    }, 5000);
  }

  // Gérer la fermeture de la fenêtre
  mainWindow.on("closed", () => {
    mainWindow = null;
    // Arrêter le serveur Next.js lorsque la fenêtre est fermée
    if (nextApp) {
      if (process.platform === "win32") {
        // Sur Windows, nous devons tuer le processus différemment
        const { exec } = require("child_process");
        exec(`taskkill /pid ${nextApp.pid} /T /F`, (error, stdout, stderr) => {
          if (error) {
            console.error(
              `Erreur lors de l'arrêt du serveur Next.js: ${error}`
            );
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
        });
      } else {
        // Sur macOS et Linux
        nextApp.kill("SIGINT");
      }
    }
  });
}

// Créer la fenêtre lorsque l'application est prête
app.on("ready", createWindow);

// Quitter l'application lorsque toutes les fenêtres sont fermées (sauf sur macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Sur macOS, recréer la fenêtre lorsque l'icône du dock est cliquée et qu'aucune fenêtre n'est ouverte
app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Gérer la fermeture de l'application
app.on("before-quit", () => {
  // Arrêter le serveur Next.js avant de quitter
  if (nextApp) {
    if (process.platform === "win32") {
      const { exec } = require("child_process");
      exec(`taskkill /pid ${nextApp.pid} /T /F`);
    } else {
      nextApp.kill("SIGINT");
    }
  }
});
