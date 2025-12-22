export interface List {
    id: string;
    user_uid?: string;
    private?: boolean | null;
    songs?: string[];
    [key: string]: any;
}

