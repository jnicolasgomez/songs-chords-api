import express from 'express'
import logger from 'morgan'
import songs from './components/routes.js';
import bodyParser from 'body-parser'
import cors from 'cors'

const port = process.env.PORT ?? 3001

const corsOptions = {
    origin: '*',
  };


const app = express()

app.use(bodyParser.json())
app.use(logger('dev'))
app.use(cors(corsOptions))

app.use('/api/songs', songs);

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})