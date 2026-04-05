import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Songs Chords API",
      version: "2.0.0",
      description: "Chords API for songs, lists, and artists",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Firebase ID token",
        },
      },
      schemas: {
        SongDetails: {
          type: "object",
          properties: {
            bpm: { type: "number", example: 120 },
            key: { type: "string", example: "Am" },
            voice: { type: "string", example: "tenor" },
          },
        },
        Song: {
          type: "object",
          properties: {
            id: { type: "string", example: "abc123" },
            user_uid: { type: "string", example: "firebase-uid-abc" },
            public: { type: "boolean", example: true },
            title: { type: "string", example: "My Song" },
            artist: { type: "string", example: "The Beatles" },
            "chords-text": { type: "string", example: "Am G C F" },
            details: { $ref: "#/components/schemas/SongDetails" },
            tags: { type: "array", items: { type: "string" }, example: ["rock", "acoustic"] },
            spotifyUrl: { type: "string", example: "https://open.spotify.com/track/..." },
            youtubeUrl: { type: "string", example: "https://www.youtube.com/watch?v=..." },
            shared_with: { type: "array", items: { type: "string" }, example: ["uid1", "uid2"], description: "Firebase UIDs of collaborators who can view and edit this song" },
          },
          required: ["id", "title", "chords-text"],
        },
        List: {
          type: "object",
          properties: {
            id: { type: "string", example: "list123" },
            user_uid: { type: "string", example: "firebase-uid-abc" },
            title: { type: "string", example: "My Setlist" },
            private: { type: "boolean", example: false },
            songs: { type: "array", items: { type: "string" }, example: ["songId1", "songId2"] },
            shared_with: { type: "array", items: { type: "string" }, example: ["uid1", "uid2"], description: "Firebase UIDs of collaborators who can view and edit this list" },
          },
          required: ["id"],
        },
        UserInfo: {
          type: "object",
          properties: {
            uid: { type: "string", example: "firebase-uid-abc" },
            email: { type: "string", example: "user@example.com" },
            displayName: { type: "string", example: "John Doe" },
          },
          required: ["uid"],
        },
        Artist: {
          type: "object",
          properties: {
            id: { type: "string", example: "the beatles", description: "Normalized lowercase name" },
            name: { type: "string", example: "The Beatles" },
          },
          required: ["id", "name"],
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            error: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/**/*.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
