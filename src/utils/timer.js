import { DATE_FORMAT } from "./consts.js";

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sleepUntilComprobanteDate(clave, minutes) {
    const claveDate = clave.slice(4, 8) + clave.slice(2, 4) + clave.slice(0, 2)
    let currentDate = getCurrentDate_YYYYMMDD()
    while (claveDate > currentDate) {
        await sleep(minutes * 60 * 1000)
        currentDate = getCurrentDate_YYYYMMDD()
    }
}

export function getCurrentDate(){
    return new Date().toLocaleString('no-nb', DATE_FORMAT)
}

function getCurrentDate_YYYYMMDD(){
    return new Date().toLocaleString('no-nb', DATE_FORMAT).replace(/-/g, '').slice(0, 8)
}