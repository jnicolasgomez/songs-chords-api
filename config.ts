import { IConfig } from "./src/interfaces/config"
import "dotenv/config";

const config: IConfig = {
  mongoDb: {
    uri: process.env.MONGO_URI || "mongodb://root:songs@localhost:27017/songs?authSource=admin",
  },
};

export default config;


