import express from 'express'
import logger from 'morgan'
import songsRoutes from './components/routes.js';
import bodyParser from 'body-parser'
import cors from 'cors'
import { initializeApp } from 'firebase-admin/app';

const port = process.env.PORT ?? 3001

const corsOptions = {
    origin: '*',
  };

initializeApp();
const app = express()

app.use(bodyParser.json())
app.use(logger('dev'))
app.use(cors(corsOptions))

app.use('/api', songsRoutes);

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})