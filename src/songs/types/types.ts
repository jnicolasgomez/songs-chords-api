
export interface Song {
    id: string;
    public: boolean;
    title: string;
    "chords-text": string;
    details: SongDetails;
    tags: string[];
    spotifyUrl?: string;
    youtubeUrl?: string;
    [key: string]: any;
}

export interface SongDetails {
    bpm?: number;
    key?: string;
    voice?: string;
}

export interface Store<T = any> {
    byUserId: (table: string, userId: string) => Promise<T[]>;
    listPublic: (table: string, fields?: string[]) => Promise<T[]>;
    get: (table: string, id: string, fields?: string[]) => Promise<T | null>;
    byIdsArray: (table: string, ids: string[], fields?: string[]) => Promise<T[]>;
    upsert: (table: string, data: any) => Promise<{id: string}>;
    list: (table: string, fields?: string[]) => Promise<T[]>;
    query: (table: string, query: any) => Promise<T[]>;
}