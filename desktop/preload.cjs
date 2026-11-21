const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("joblyDesktop", Object.freeze({
  subscriptionStatus: (provider) => ipcRenderer.invoke("jobly:subscription-status", provider),
  subscriptionConnect: (provider) => ipcRenderer.invoke("jobly:subscription-connect", provider),
  subscriptionDisconnect: (provider) => ipcRenderer.invoke("jobly:subscription-disconnect", provider),
  status: () => ipcRenderer.invoke("jobly:status"),
  collect: (data) => ipcRenderer.invoke("jobly:collect", data),
  cancel: () => ipcRenderer.invoke("jobly:cancel"),
  sources: (ids) => ipcRenderer.invoke("jobly:sources", ids),
  repair: () => ipcRenderer.invoke("jobly:repair"),
  backup: () => ipcRenderer.invoke("jobly:backup"),
  restore: () => ipcRenderer.invoke("jobly:restore"),
  openData: () => ipcRenderer.invoke("jobly:open-data"),
}));
