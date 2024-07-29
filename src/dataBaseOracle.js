const oracledb = require('oracledb');

// Configuración del pool de conexiones
var poolConfig = {
    user: 'SSI_JGONZALES',
    password: 'Nuev0P455w0rd',
    connectString: '10.49.5.76:1521/odb',
};

// Inicializar el pool de conexiones
async function initialize() {
    try {
        await oracledb.createPool(poolConfig);
        console.log('Pool de conexiones creado Oracle');
    } catch (error) {
        console.error('Error al crear el pool de conexiones:', error);
    }
}

module.exports.initialize = initialize;
