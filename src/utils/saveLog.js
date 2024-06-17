import fs from 'fs'

export function saveLog(name, title, message) {
    const fileName = `${name}.log`
    if (!fs.existsSync(fileName)) fs.writeFileSync(fileName, '')
    const stream = fs.createWriteStream(fileName, { flags: 'a' })
    const currentDate = new Date()
    stream.write(`${currentDate.toLocaleString('sv')} - ${title}: ${message}\n`)
    stream.end()
}