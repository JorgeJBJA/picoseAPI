export function toBase64(str){
    return Buffer.from(str).toString('base64')
}