// ZX Spectrum BASIC to TAP generator (minimal, legal, 100% propio)
// Copyright (C) 2026 Raül Torralba Adsuara
// License: AGPLv3 or later
//
// Este archivo convierte código BASIC (string) a un ArrayBuffer con el formato TAP.
// No usa código de remysharp ni de zx-tools.

function stringToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xFF);
    }
    return bytes;
}

function tapChecksum(bytes) {
    return bytes.reduce((a, b) => a ^ b, 0);
}

export function generateTapFromBasic(basicCode, filename = "PROGRAM") {
    // 1. Prepara el bloque BASIC (tokenizado, pero aquí solo ASCII plano para ejemplo)
    // ZX Spectrum espera líneas numeradas: 10 PRINT "HELLO"
    // Para un generador real, deberías tokenizar palabras clave BASIC.
    // Aquí solo convertimos a bytes ASCII (válido para líneas simples).
    const basicLines = basicCode.split(/\r?\n/).filter(l => l.trim().length > 0);
    let basicBytes = [];
    for (const line of basicLines) {
        // Formato de línea: [2 bytes: número de línea][2 bytes: longitud][contenido][0x0D]
        const match = line.match(/^(\d+)\s+(.*)$/);
        if (!match) continue;
        const lineNum = parseInt(match[1]);
        const content = match[2];
        const contentBytes = stringToBytes(content);
        const length = contentBytes.length + 1; // +1 for 0x0D
        basicBytes.push((lineNum >> 8) & 0xFF, lineNum & 0xFF, length & 0xFF, (length >> 8) & 0xFF);
        basicBytes.push(...contentBytes, 0x0D);
    }
    // Añade un 0x00 al final (fin de programa)
    basicBytes.push(0x00);

    // 2. Construye el bloque TAP
    // Cabecera: 19 bytes
    const header = [
        0x00, // Flag byte (header)
        0x00, // Type: BASIC
        ...stringToBytes(filename.padEnd(10).slice(0, 10)), // Filename (10 bytes)
        (basicBytes.length & 0xFF), (basicBytes.length >> 8) & 0xFF, // Length (little endian)
        0x00, 0x80, // Start line (32768)
        (basicBytes.length & 0xFF), (basicBytes.length >> 8) & 0xFF // Program length again
    ];
    header.push(tapChecksum(header));

    // Data block: [0xFF][data...][checksum]
    const dataBlock = [0xFF, ...basicBytes];
    dataBlock.push(tapChecksum(dataBlock));

    // TAP file: [header length][header][data length][data]
    const tap = [];
    tap.push(header.length & 0xFF, (header.length >> 8) & 0xFF, ...header);
    tap.push(dataBlock.length & 0xFF, (dataBlock.length >> 8) & 0xFF, ...dataBlock);

    // Devuelve como ArrayBuffer
    return new Uint8Array(tap).buffer;
}

// Ejemplo de uso:
// const tapBuffer = generateTapFromBasic('10 PRINT "HELLO"\n20 STOP');
// Descarga: new Blob([tapBuffer], {type: 'application/x-tap'})
