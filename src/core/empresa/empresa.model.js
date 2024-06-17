import { conn, generarDBName } from "../../utils/db.js"

export async function getEmpresaByRuc(database, ruc) {
    const db = conn(database)
    const [res] = await db.query('SELECT nregistro, ruc, razon, email, clave_email, logotipo, firma, clave_firma FROM empresa WHERE ruc=?', [ruc])
    db.end()
    if (!res[0]) throw new Error(`Empresa ${ruc} no existe`)
    return res[0]
}

export async function getEstablecimientoByNro(database, nregistro, establecimiento) {
    const dbname = generarDBName(database, nregistro)
    const db = conn(dbname)
    const [res] = await db.query('SELECT * FROM centros WHERE estable=? AND funciona=?', [establecimiento, 'SI'])
    db.end()
    return res[0]
}

export async function updateEmail(database, ruc, email, clave_email) {
    const db = conn(database)
    const [res] = await db.query('UPDATE empresa SET email=?, clave_email=? WHERE ruc=?', [email, clave_email, ruc])
    db.end()
}

export async function updateClaveFirma(database, ruc, clave_firma, firma_ini, firma_fin) {
    const db = conn(database)
    const [res] = await db.query('UPDATE empresa SET clave_firma=?, firma_ini=?, firma_fin=? WHERE ruc=?',
        [clave_firma, firma_ini, firma_fin, ruc]
    )
    db.end()
}

export async function updateFirma(database, ruc, firma) {
    const db = conn(database)
    const [res] = await db.query('UPDATE empresa SET firma=? WHERE ruc=?',
        [firma, ruc]
    )
    db.end()
}

export async function updateLogo(database, ruc, logo) {
    const db = conn(database)
    const [res] = await db.query('UPDATE empresa SET logotipo=? WHERE ruc=?',
        [logo, ruc]
    )
    db.end()
}