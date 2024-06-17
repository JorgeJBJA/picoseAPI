import express from "express";
import morgan from "morgan";
import cors from "cors"
import "dotenv/config"

import autorizacionRoutesV1 from "./api/v1/routes/autorizacion.routes.js"
import empresaRoutesV1 from './api/v1/routes/empresa.routes.js'

const app = express()
const port = process.env.PORT || process.env.EXPRESS_PORT

//MIDDLEWARES
app.use(morgan(process.env.EXPRESS_MORGAN))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({ origin: true, credentials: true }))

function main() {
    try {
        //EndPoint de verificacion
        app.get('/health', (req, res) => res.send('OK'))

        //API V1
        app.use('/api/v1/autorizacion', autorizacionRoutesV1)
        app.use('/api/v1/empresa', empresaRoutesV1)

        app.listen(port, () => {
            console.log(`Server on port ${port}`)
        })
    } catch (error) {
        console.error('Server error:', error);
    }
}

main();