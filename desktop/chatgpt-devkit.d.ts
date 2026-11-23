declare module "@jobly/chatgpt-devkit" {
  export function createChatGPT(config: {
    appName: string;
    appId: string;
    sendHostId: boolean;
    redirectPort: number;
    storageDir: string;
    credentialEncryption: {
      id: string;
      isAvailable: () => boolean;
      encrypt: (text: string) => Buffer;
      decrypt: (data: Uint8Array) => string;
    };
    openBrowser: (url: string) => Promise<void>;
  }): {
    getSession: () => Promise<{ status: string; sharing: boolean }>;
    listModels: (options: { signal: AbortSignal }) => Promise<{ slug: string; displayName: string }[]>;
    signIn: (options: { signal: AbortSignal }) => Promise<unknown>;
    disconnect: () => Promise<unknown>;
    cancelSignIn: () => void;
    streamResponse: (options: {
      model: string;
      input: string;
      instructions: string;
      signal: AbortSignal;
      onDelta: (delta: string) => void;
    }) => Promise<{ text: string }>;
  };
}
