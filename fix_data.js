const fs = require('fs');

console.log('Lendo data.json original...');
const rawData = fs.readFileSync('data.json', 'utf8');

// The original file might have double encoded UTF8 (Mojibake)
// In Node, we can try to decode it by taking the string, turning it into latin1, and decoding as utf8
function fixMojibake(str) {
    if (!str || typeof str !== 'string') return str;
    try {
        // Tratar "Contatos DisponÃveis" -> "Contatos Disponíveis" etc.
        // It's a common issue where UTF-8 bytes were read as Latin1.
        return decodeURIComponent(escape(str));
    } catch (e) {
        return str; // If it fails, return original
    }
}

let parsedData;
try {
    parsedData = JSON.parse(rawData);
} catch (e) {
    console.error("Erro no parse do JSON original", e);
    process.exit(1);
}

console.log('Limpando chaves e consertando textos...');
const cleanData = parsedData.map(row => {
    let newRow = {};
    for (const [key, value] of Object.entries(row)) {
        // Remove espaços iniciais e finais da chave
        const cleanKey = key.trim();
        // Conserta possível mojibake no valor e remove espaços soltos
        let cleanValue = value;
        if (typeof value === 'string') {
            cleanValue = fixMojibake(value).trim();
        }
        newRow[cleanKey] = cleanValue;
    }
    return newRow;
});

// Update the keys globally since we will change app.js to use clean keys.
// ' NOME' -> 'NOME', ' E-MAIL' -> 'E-MAIL', etc.

fs.writeFileSync('data.json', JSON.stringify(cleanData, null, 2), 'utf8');
console.log(`Sucesso: ${cleanData.length} registros lavados e salvos em data.json.`);
