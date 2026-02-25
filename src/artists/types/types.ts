export interface Artist {
  id: string;   // normalized name: name.toLowerCase().trim() — guarantees no duplicates
  name: string; // display name as entered
}
