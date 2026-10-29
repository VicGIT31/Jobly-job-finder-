const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("joblyDesktop", Object.freeze({
  status: () => ipcRenderer.invoke("jobly:status"),
  setup: (data) => ipcRenderer.invoke("jobly:setup", data),
  collect: () => ipcRenderer.invoke("jobly:collect"),
  cancel: () => ipcRenderer.invoke("jobly:cancel"),
  sources: (ids) => ipcRenderer.invoke("jobly:sources", ids),
  repair: () => ipcRenderer.invoke("jobly:repair"),
  backup: () => ipcRenderer.invoke("jobly:backup"),
  restore: () => ipcRenderer.invoke("jobly:restore"),
  openData: () => ipcRenderer.invoke("jobly:open-data"),
}));
