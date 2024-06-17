import { conn, generarDBName } from "../../utils/db.js"
import { getCurrentDate } from "../../utils/timer.js";

export async function updateAutorizacion(database, nregistro, claveAcceso, autorizacion, comprobante, fechaAutorizacion) {
    const tipoComprobante = claveAcceso.slice(8, 10)
    let updateQuery

    switch (tipoComprobante) {
        case '01':
        case '04':
            updateQuery = 'UPDATE facdet SET autoriza=?, fecha_aut=? WHERE codigoaut=?'
            break;
        case '03':
        case '07':
            updateQuery = 'UPDATE trandet SET autret=?, fecha_aut=? WHERE claret=?'
            break;
        case '06':
            updateQuery = 'UPDATE guidet SET autgui=?, fecha_aut=? WHERE clagui=?'
            break;
        default:
            break;
    }

    const dbname = generarDBName(database, nregistro)
    const db = conn(dbname)
    fechaAutorizacion = fechaAutorizacion ? fechaAutorizacion.slice(0, 19).replace('T', ' ') : null
    const [res] = await db.query(updateQuery, [autorizacion.slice(0, 49), fechaAutorizacion, claveAcceso])
    db.end()

    if (autorizacion !== 'AUTORIZADO') {
        const dbError = conn(database)
        const [res] = await dbError.query('INSERT INTO error_comprobantes (clave, comprobante, error, fecha) VALUES (?,?,?,?)',
            [claveAcceso, comprobante, autorizacion, getCurrentDate()])
        dbError.end()
    }
}

export async function getFechaAutComprobante(database, nregistro, claveAcceso) {
    const tipoComprobante = claveAcceso.slice(8, 10)
    let selectQuery

    switch (tipoComprobante) {
        case '01':
        case '04':
        case '05':
            selectQuery = 'SELECT fecha_aut FROM facdet WHERE codigoaut=?'
            break;
        case '03':
        case '07':
            selectQuery = 'SELECT fecha_aut FROM trandet WHERE claret=?'
            break;
        case '06':
            selectQuery = 'SELECT fecha_aut FROM guidet WHERE clagui=?'
            break;
        default:
            break;
    }

    const dbname = generarDBName(database, nregistro)
    const db = conn(dbname)
    const [res] = await db.query(selectQuery, [claveAcceso])
    db.end()
    return res[0] ? res[0].fecha_aut : new Date('2024-01-01 12:00:00')//cambiar new date por undefined
}