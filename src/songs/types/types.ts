
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

export interface Store {
    byUserId: (table: string, userId: string) => Promise<Song[]>;
    listPublic: (table: string, fields?: string[]) => Promise<Song[]>;
    get: (table: string, id: string, fields?: string[]) => Promise<Song | null>;
    byIdsArray: (table: string, ids: string[], fields?: string[]) => Promise<Song[]>;
    upsert: (table: string, data: any) => Promise<{id: string}>;
    list: (table: string, fields?: string[]) => Promise<Song[]>;
}