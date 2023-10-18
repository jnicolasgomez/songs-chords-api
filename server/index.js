import express from 'express'
import logger from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url';
import availability from './availability/routes.js';

const port = process.env.PORT ?? 3000

const app = express()
app.use(logger('dev'))

// app.get('/', (req, res) => {
//     res.sendFile(process.cwd() + '/client/index.html')
// })
// Get the current directory's path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Serve static files from the "public" directory
app.use(express.static('public'))
app.use('/api/availability', availability);

app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})