// actualizar-todos-passwords.js
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sistema_sb'
});

const actualizarTodosLosPasswords = async () => {
    console.log('🔄 Conectando a la base de datos...');
    
    db.connect(async (err) => {
        if (err) {
            console.error('❌ Error conectando a MySQL:', err.message);
            process.exit(1);
        }
        
        console.log('✅ Conectado a MySQL');
        
        // Obtener TODOS los usuarios de todas las tablas
        const tables = ['alumno', 'jefe_servicio', 'administrador'];
        
        let totalActualizados = 0;
        let totalErrores = 0;

        console.log('\n📝 Actualizando TODAS las contraseñas...');
        
        for (const table of tables) {
            console.log(`\n--- Procesando tabla: ${table} ---`);
            
            try {
                // Obtener todos los usuarios de esta tabla
                const users = await new Promise((resolve, reject) => {
                    db.execute(`SELECT * FROM ${table}`, (err, results) => {
                        if (err) reject(err);
                        else resolve(results);
                    });
                });
                
                console.log(`📊 Encontrados ${users.length} usuarios en ${table}`);
                
                // Actualizar cada usuario
                for (const user of users) {
                    try {
                        // Verificar si ya está encriptado (los encriptados son más largos)
                        const isAlreadyEncrypted = user.password_hash && user.password_hash.length > 20;
                        
                        if (!isAlreadyEncrypted) {
                            // Usar la contraseña existente o '123456' por defecto
                            const plainPassword = user.password_hash || '123456';
                            const passwordHash = await bcrypt.hash(plainPassword, 10);
                            
                            await new Promise((resolve, reject) => {
                                const updateQuery = `UPDATE ${table} SET password_hash = ? WHERE ${table === 'alumno' ? 'id_alumno' : table === 'jefe_servicio' ? 'id_jefe' : 'id_admin'} = ?`;
                                db.execute(updateQuery, [passwordHash, user[`id_${table === 'administrador' ? 'admin' : table.replace('_servicio', '')}`]], (err, results) => {
                                    if (err) reject(err);
                                    else resolve(results);
                                });
                            });
                            
                            console.log(`✅ ${table}: ${user.correo_electronico} -> Actualizado`);
                            totalActualizados++;
                        } else {
                            console.log(`⏭️  ${table}: ${user.correo_electronico} -> Ya estaba encriptado`);
                        }
                    } catch (error) {
                        console.error(`❌ ${table}: ${user.correo_electronico} -> Error: ${error.message}`);
                        totalErrores++;
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error procesando tabla ${table}:`, error.message);
                totalErrores++;
            }
        }
        
        console.log(`\n🎉 ACTUALIZACIÓN COMPLETADA:`);
        console.log(`✅ ${totalActualizados} contraseñas actualizadas`);
        console.log(`❌ ${totalErrores} errores`);
        
        // Verificación final
        console.log('\n🔍 VERIFICACIÓN FINAL:');
        for (const table of tables) {
            const sampleUsers = await new Promise((resolve, reject) => {
                db.execute(`SELECT correo_electronico, LENGTH(password_hash) as hash_length FROM ${table} LIMIT 3`, (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
            
            console.log(`\n${table}:`);
            sampleUsers.forEach(user => {
                console.log(`  ${user.correo_electronico} -> Hash length: ${user.hash_length}`);
            });
        }
        
        db.end();
        console.log('\n✨ Todos los usuarios ahora pueden iniciar sesión con sus contraseñas actuales');
        process.exit(0);
    });
};

// Ejecutar el script
actualizarTodosLosPasswords();