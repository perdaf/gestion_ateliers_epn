// Fichier preload.js pour Electron
// Ce fichier est exécuté dans le contexte du processus de rendu avant que le contenu web ne soit chargé
// Il permet d'exposer des API spécifiques à Electron au processus de rendu de manière sécurisée

const { contextBridge, ipcRenderer } = require("electron");

// Exposer des API sécurisées au processus de rendu
contextBridge.exposeInMainWorld("electron", {
  // Ajouter ici des fonctions que vous souhaitez exposer à l'application web
  // Par exemple, pour obtenir des informations sur la version de l'application
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Vous pouvez ajouter d'autres fonctions selon les besoins de votre application
});

// Vous pouvez également ajouter des écouteurs d'événements pour communiquer avec le processus principal
window.addEventListener("DOMContentLoaded", () => {
  // Code à exécuter une fois que le DOM est chargé
  console.log("Application Electron chargée avec succès");
});
