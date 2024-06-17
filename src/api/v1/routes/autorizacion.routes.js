import { Router } from "express";
import { autorizar,reenvioEmail, descargarAutorizacion, getRIDE, getFirmaXML } from "../../../controllers/autorizacion.controller.js";

const router = Router()

router.post('/autorizar', autorizar)
router.post('/reenvioEmail', reenvioEmail)
router.get('/descargar', descargarAutorizacion)
router.get('/ride', getRIDE)
router.get('/firmaXml', getFirmaXML)

export default router