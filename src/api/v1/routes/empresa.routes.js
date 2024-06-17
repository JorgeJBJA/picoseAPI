import { Router } from "express";
import { validarClaveEmail, validarClaveFirma } from "../../../controllers/empresa.controller.js";

const router = Router()

router.get('/validarClaveFirma', validarClaveFirma)
router.get('/validarClaveEmail', validarClaveEmail)

export default router