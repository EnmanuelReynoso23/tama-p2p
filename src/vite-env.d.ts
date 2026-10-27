/// <reference types="vite/client" />

declare module 'y-webrtc' {
  import * as Y from 'yjs';

  export interface WebrtcProviderOptions {
    signaling?: string[];
    password?: string | null;
    awareness?: unknown;
    maxConns?: number;
    filterBcConns?: boolean;
    peerOpts?: unknown;
  }

  export class WebrtcProvider {
    readonly roomName: string;
    readonly doc: Y.Doc;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly awareness: any;
    connected: boolean;
    constructor(roomName: string, doc: Y.Doc, opts?: WebrtcProviderOptions);
    connect(): void;
    disconnect(): void;
    destroy(): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, handler: (...args: any[]) => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    off(event: string, handler: (...args: any[]) => void): void;
  }
}

declare module 'y-indexeddb' {
  import * as Y from 'yjs';

  export class IndexeddbPersistence {
    readonly name: string;
    readonly doc: Y.Doc;
    readonly whenSynced: Promise<IndexeddbPersistence>;
    synced: boolean;
    constructor(name: string, doc: Y.Doc);
    destroy(): Promise<void>;
    clearData(): Promise<void>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, handler: (...args: any[]) => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    off(event: string, handler: (...args: any[]) => void): void;
  }
}
