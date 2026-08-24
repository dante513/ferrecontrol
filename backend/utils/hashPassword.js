// ==============================================================================
// UTILIDAD: Generar un password_hash con bcrypt
// Uso: node utils/hashPassword.js "miContraseña"
// Copia el resultado en la columna password_hash de la tabla usuarios.
// ==============================================================================
const bcrypt = require('bcryptjs');

const plainPassword = process.argv[2];

if (!plainPassword) {
    console.error('Uso: node hashPassword.js "tuContraseña"');
    process.exit(1);
}

const SALT_ROUNDS = 10;

bcrypt.hash(plainPassword, SALT_ROUNDS).then((hash) => {
    console.log('\nHash generado (cópialo en password_hash):\n');
    console.log(hash);
    console.log('');
});
