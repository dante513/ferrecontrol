// ==============================================================================
// AUDITORÍA
// Registra quién hizo qué, cuándo y desde qué IP. Se llama DESPUÉS de que
// la acción principal ya tuvo éxito, y de forma "fire and forget": si el
// registro de auditoría falla por algún motivo, no debe tumbar la
// respuesta que el usuario ya está esperando — solo se deja constancia en
// la consola del servidor.
// ==============================================================================

function registrarAuditoria(db, { usuario_id, accion, entidad, entidad_id, detalle, ip }) {
    try {
        const resultado = db.query(
            `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [usuario_id || null, accion, entidad, entidad_id || null, detalle || null, ip || null]
        );
        // db.query() de 'pg' siempre devuelve una Promesa; este chequeo es
        // solo una salvaguarda extra (por ejemplo, contra un mock de
        // pruebas mal configurado) para que un problema de auditoría
        // nunca tumbe la petición principal del usuario.
        if (resultado && typeof resultado.catch === 'function') {
            resultado.catch((error) => {
                console.error('⚠️  No se pudo registrar la auditoría:', error.message);
            });
        }
    } catch (error) {
        console.error('⚠️  No se pudo registrar la auditoría:', error.message);
    }
}

module.exports = { registrarAuditoria };
