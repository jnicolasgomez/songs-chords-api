import { IConfig } from "./src/interfaces/config"

const config: IConfig = {
  mongoDb: {
    uri:
      "mongodb://root:example@localhost:27017/songs?authSource=admin",
  },
};

export default config;

// const config: IConfig = {
//   mongoDb: {
//     uri:
//       process.env.MONGO_URI || 
//      "mongodb+srv://<db_username>:<db_password>@songs.k1sved5.mongodb.net/?retryWrites=true&w=majority&appName=Songs"
//   },
// };



