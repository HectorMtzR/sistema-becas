const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

// Configuración
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Sessions
app.use(session({
    secret: 'secreto_becas_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Conexión a MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'sistema_sb'
});

db.connect((err) => {
    if (err) {
        console.log('❌ Error conectando a MySQL:', err.message);
        return;
    }
    console.log('✅ Conectado a MySQL - Base de datos: sistema_sb');
});

// Middleware para verificar sesión
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    next();
};

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

/*
// Ruta de login
app.post('/api/login', async (req, res) => {
    const { correo, password, tipo } = req.body;
    
    console.log('Intento de login:', { correo, tipo });
    
    if (!correo || !password || !tipo) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    
    let table = '';
    let idField = '';
    
    switch(tipo) {
        case 'alumno':
            table = 'alumno';
            idField = 'id_alumno';
            break;
        case 'jefe':
            table = 'jefe_servicio';
            idField = 'id_jefe';
            break;
        case 'admin':
            table = 'administrador';
            idField = 'id_admin';
            break;
        default:
            return res.status(400).json({ error: 'Tipo de usuario inválido' });
    }
    
    const query = `SELECT * FROM ${table} WHERE correo_electronico = ?`;
    
    db.execute(query, [correo], (err, results) => {
        if (err) {
            console.error('❌ Error en consulta SQL:', err);
            return res.status(500).json({ error: 'Error del servidor al buscar usuario' });
        }
        
        console.log(`Resultados encontrados para ${correo}:`, results.length);
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        const user = results[0];
        
        // Para desarrollo: password simple "123456"
        if (password === '123456') {
            req.session.user = {
                id: user[idField],
                nombre: user.nombre_completo,
                correo: user.correo_electronico,
                tipo: tipo
            };
            
            console.log('✅ Login exitoso:', req.session.user);
            
            res.json({ 
                success: true, 
                user: req.session.user 
            });
        } else {
            console.log('❌ Contraseña incorrecta para:', correo);
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
    });
});
*/

// Ruta de login automático (detecta tipo de usuario)
app.post('/api/login-auto', async (req, res) => {
    const { correo, password } = req.body;
    
    console.log('Intento de login automático:', { correo });
    
    if (!correo || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }
    
    // Buscar en todas las tablas para detectar el tipo de usuario
    const tables = [
        { name: 'alumno', tipo: 'alumno', idField: 'id_alumno' },
        { name: 'jefe_servicio', tipo: 'jefe', idField: 'id_jefe' },
        { name: 'administrador', tipo: 'admin', idField: 'id_admin' }
    ];
    
    let userFound = null;
    let userType = null;
    
    // Función para buscar en una tabla específica
    const searchInTable = (table) => {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM ${table.name} WHERE correo_electronico = ? AND activo = TRUE`;
            
            db.execute(query, [correo], (err, results) => {
                if (err) {
                    reject(err);
                } else if (results.length > 0) {
                    resolve({ user: results[0], tipo: table.tipo, idField: table.idField });
                } else {
                    resolve(null);
                }
            });
        });
    };
    
    try {
        // Buscar secuencialmente en todas las tablas
        for (const table of tables) {
            const result = await searchInTable(table);
            if (result) {
                userFound = result.user;
                userType = result.tipo;
                break;
            }
        }
        
        if (!userFound) {
            console.log('Usuario no encontrado:', correo);
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        // Verificar contraseña (en desarrollo: 123456)
        // En producción deberías usar: await bcrypt.compare(password, userFound.password_hash)
        if (password === '123456') {
            req.session.user = {
                id: userFound[userType === 'alumno' ? 'id_alumno' : 
                             userType === 'jefe' ? 'id_jefe' : 'id_admin'],
                nombre: userFound.nombre_completo,
                correo: userFound.correo_electronico,
                tipo: userType
            };
            
            console.log('✅ Login automático exitoso:', req.session.user);
            
            res.json({ 
                success: true, 
                user: req.session.user,
                message: `Bienvenido ${userFound.nombre_completo} (${userType})`
            });
        } else {
            console.log('❌ Contraseña incorrecta para:', correo);
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
    } catch (error) {
        console.error('❌ Error en login automático:', error);
        res.status(500).json({ error: 'Error del servidor al buscar usuario' });
    }
});

// Ruta para verificar sesión
app.get('/api/sesion', (req, res) => {
    res.json({ user: req.session.user || null });
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// En la ruta /api/alumno/datos - ACTUALIZAR
app.get('/api/alumno/datos', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT 
            a.*, 
            j.nombre_completo as jefe_nombre, 
            j.area,
            a.porcentaje_beca as total_horas  -- Ahora las horas totales = porcentaje de beca
        FROM alumno a 
        LEFT JOIN jefe_servicio j ON a.id_jefe = j.id_jefe 
        WHERE a.id_alumno = ?
    `;
    
    db.execute(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Error cargando datos alumno:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        
        const alumno = results[0];
        // Calcular progreso
        const porcentaje = alumno.porcentaje_beca > 0 ? 
            Math.round((alumno.horas_hechas / alumno.porcentaje_beca) * 100) : 0;
        
        res.json({ 
            success: true, 
            alumno: {
                ...alumno,
                total_horas: alumno.porcentaje_beca, // Horas totales = porcentaje de beca
                porcentaje_completado: porcentaje
            }
        });
    });
});

// Asistencias del alumno
app.get('/api/alumno/asistencias', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT * FROM registro_asistencia 
        WHERE id_alumno = ? 
        ORDER BY fecha DESC, check_in DESC 
        LIMIT 20
    `;
    
    db.execute(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Error cargando asistencias:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, asistencias: results });
    });
});

// Verificar sesión activa
app.get('/api/alumno/sesion-activa', requireAuth, (req, res) => {
    const fechaHoy = new Date().toISOString().split('T')[0];
    
    const query = `
        SELECT * FROM registro_asistencia 
        WHERE id_alumno = ? AND fecha = ? AND check_out IS NULL
    `;
    
    db.execute(query, [req.session.user.id, fechaHoy], (err, results) => {
        if (err) {
            console.error('Error verificando sesión activa:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ 
            sesionActiva: results.length > 0,
            registro: results[0] || null
        });
    });
});

// Registrar check-in
app.post('/api/alumno/checkin', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    
    // Verificar si ya tiene check-in hoy
    const checkQuery = `
        SELECT * FROM registro_asistencia 
        WHERE id_alumno = ? AND fecha = ? AND check_out IS NULL
    `;
    
    db.execute(checkQuery, [req.session.user.id, fechaHoy], (err, results) => {
        if (err) {
            console.error('Error verificando check-in:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Ya tienes un check-in activo para hoy' });
        }
        
        // Obtener el id_jefe del alumno
        const alumnoQuery = `SELECT id_jefe FROM alumno WHERE id_alumno = ?`;
        
        db.execute(alumnoQuery, [req.session.user.id], (err, alumnoResults) => {
            if (err || alumnoResults.length === 0) {
                return res.status(500).json({ error: 'Error obteniendo datos del alumno' });
            }
            
            const idJefe = alumnoResults[0].id_jefe;
            
            // Insertar nuevo registro
            const insertQuery = `
                INSERT INTO registro_asistencia 
                (id_alumno, id_jefe, fecha, check_in) 
                VALUES (?, ?, ?, NOW())
            `;
            
            db.execute(insertQuery, [req.session.user.id, idJefe, fechaHoy], (err, results) => {
                if (err) {
                    console.error('Error registrando check-in:', err);
                    return res.status(500).json({ error: 'Error al registrar check-in' });
                }
                
                res.json({ success: true, message: 'Check-in registrado' });
            });
        });
    });
});

// Registrar check-out
app.post('/api/alumno/checkout', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    
    // Buscar registro activo
    const findQuery = `
        SELECT * FROM registro_asistencia 
        WHERE id_alumno = ? AND fecha = ? AND check_out IS NULL
    `;
    
    db.execute(findQuery, [req.session.user.id, fechaHoy], (err, results) => {
        if (err) {
            console.error('Error buscando registro activo:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(400).json({ error: 'No tienes un check-in activo' });
        }
        
        const registro = results[0];
        const checkIn = new Date(registro.check_in);
        const checkOut = new Date();
        
        // Calcular horas trabajadas
        const diffMs = checkOut - checkIn;
        const horasTrabajadas = (diffMs / (1000 * 60 * 60)).toFixed(2);
        
        // Actualizar registro con check-out y horas
        const updateQuery = `
            UPDATE registro_asistencia 
            SET check_out = NOW(), horas_trabajadas = ?
            WHERE id_registro = ?
        `;
        
        db.execute(updateQuery, [horasTrabajadas, registro.id_registro], (err, results) => {
            if (err) {
                console.error('Error registrando check-out:', err);
                return res.status(500).json({ error: 'Error al registrar check-out' });
            }
            
            res.json({ success: true, message: 'Check-out registrado', horas: horasTrabajadas });
        });
    });
});

// RUTAS DE DASHBOARD (AGREGA ESTO)
app.get('/alumno/dashboard', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'alumno-dashboard.html'));
});

app.get('/jefe/dashboard', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'jefe-dashboard.html'));
});

app.get('/admin/dashboard', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// Ruta para verificar estado de BD
app.get('/api/status', (req, res) => {
    db.query('SELECT 1 + 1 as result', (err, results) => {
        if (err) {
            res.json({ database: 'Error', message: err.message });
        } else {
            res.json({ database: 'Conectado', result: results[0].result });
        }
    });
});

// ==================== RUTAS DEL JEFE ====================

// Datos del jefe y resumen
app.get('/api/jefe/datos', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    // Datos del jefe
    const jefeQuery = `SELECT * FROM jefe_servicio WHERE id_jefe = ?`;
    
    db.execute(jefeQuery, [req.session.user.id], (err, jefeResults) => {
        if (err) {
            console.error('Error cargando datos jefe:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (jefeResults.length === 0) {
            return res.status(404).json({ error: 'Jefe no encontrado' });
        }
        
        const jefe = jefeResults[0];
        
        // Resumen del área
        // En la ruta /api/admin/resumen - ACTUALIZAR
        const resumenQuery = `
            SELECT 
                (SELECT COUNT(*) FROM alumno WHERE activo = TRUE) as totalAlumnos,
                (SELECT COUNT(*) FROM jefe_servicio WHERE activo = TRUE) as totalJefes,
                (SELECT COALESCE(SUM(horas_hechas), 0) FROM alumno) as totalHoras,
                (SELECT COALESCE(SUM(porcentaje_beca), 0) FROM alumno WHERE activo = TRUE) as totalHorasRequeridas,
                (SELECT COUNT(*) FROM registro_asistencia WHERE confirmacion = FALSE AND check_out IS NOT NULL) as totalPendientes
        `;
        
        db.execute(resumenQuery, [req.session.user.id], (err, resumenResults) => {
            if (err) {
                console.error('Error cargando resumen:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }
            
            res.json({ 
                success: true, 
                jefe: jefe,
                resumen: resumenResults[0] 
            });
        });
    });
});

// Alumnos asignados al jefe
app.get('/api/jefe/alumnos', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT * FROM alumno 
        WHERE id_jefe = ? AND activo = TRUE 
        ORDER BY nombre_completo
    `;
    
    db.execute(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Error cargando alumnos:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, alumnos: results });
    });
});

// Registros pendientes de confirmación
app.get('/api/jefe/registros-pendientes', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT 
            ra.*,
            a.nombre_completo as alumno_nombre
        FROM registro_asistencia ra
        JOIN alumno a ON ra.id_alumno = a.id_alumno
        WHERE ra.id_jefe = ? 
        AND ra.check_out IS NOT NULL 
        AND ra.confirmacion = FALSE
        ORDER BY ra.fecha DESC, ra.check_in DESC
    `;
    
    db.execute(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Error cargando registros pendientes:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, registros: results });
    });
});

// Detalles de un registro específico
app.get('/api/jefe/registro/:id', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT 
            ra.*,
            a.nombre_completo as alumno_nombre,
            a.carrera,
            a.semestre
        FROM registro_asistencia ra
        JOIN alumno a ON ra.id_alumno = a.id_alumno
        WHERE ra.id_registro = ? AND ra.id_jefe = ?
    `;
    
    db.execute(query, [req.params.id, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Error cargando registro:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        
        res.json({ success: true, registro: results[0] });
    });
});

// Confirmar o rechazar registro
app.post('/api/jefe/confirmar-registro', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id_registro, confirmar, observaciones } = req.body;
    
    // Primero verificar que el registro pertenece a este jefe
    const verifyQuery = `SELECT * FROM registro_asistencia WHERE id_registro = ? AND id_jefe = ?`;
    
    db.execute(verifyQuery, [id_registro, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Error verificando registro:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registro no encontrado' });
        }
        
        const registro = results[0];
        
        if (confirmar) {
            // Confirmar registro y actualizar horas del alumno
            const updateQuery = `
                UPDATE registro_asistencia 
                SET confirmacion = TRUE, observaciones = ?
                WHERE id_registro = ?
            `;
            
            db.execute(updateQuery, [observaciones, id_registro], (err, results) => {
                if (err) {
                    console.error('Error confirmando registro:', err);
                    return res.status(500).json({ error: 'Error al confirmar registro' });
                }
                
                // Actualizar horas hechas del alumno
                const horasQuery = `
                    UPDATE alumno 
                    SET horas_hechas = horas_hechas + ? 
                    WHERE id_alumno = ?
                `;
                
                db.execute(horasQuery, [registro.horas_trabajadas, registro.id_alumno], (err, results) => {
                    if (err) {
                        console.error('Error actualizando horas:', err);
                        // Aún así respondemos éxito porque el registro se confirmó
                    }
                    
                    res.json({ success: true, message: 'Registro confirmado' });
                });
            });
        } else {
            // Rechazar registro
            const updateQuery = `
                UPDATE registro_asistencia 
                SET confirmacion = FALSE, observaciones = ?
                WHERE id_registro = ?
            `;
            
            db.execute(updateQuery, [observaciones, id_registro], (err, results) => {
                if (err) {
                    console.error('Error rechazando registro:', err);
                    return res.status(500).json({ error: 'Error al rechazar registro' });
                }
                
                res.json({ success: true, message: 'Registro rechazado' });
            });
        }
    });
});

// ==================== RUTAS DEL ADMINISTRADOR ====================

// Resumen general del sistema
app.get('/api/admin/resumen', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    // Resumen general
    // En la ruta /api/admin/resumen - ACTUALIZAR
    const resumenQuery = `
        SELECT 
            (SELECT COUNT(*) FROM alumno WHERE activo = TRUE) as totalAlumnos,
            (SELECT COUNT(*) FROM jefe_servicio WHERE activo = TRUE) as totalJefes,
            (SELECT COALESCE(SUM(horas_hechas), 0) FROM alumno) as totalHoras,
            (SELECT COALESCE(SUM(porcentaje_beca), 0) FROM alumno WHERE activo = TRUE) as totalHorasRequeridas,
            (SELECT COUNT(*) FROM registro_asistencia WHERE confirmacion = FALSE AND check_out IS NOT NULL) as totalPendientes
    `;
    
    // Últimos registros
    const registrosQuery = `
        SELECT 
            ra.*,
            a.nombre_completo as alumno_nombre,
            j.nombre_completo as jefe_nombre
        FROM registro_asistencia ra
        JOIN alumno a ON ra.id_alumno = a.id_alumno
        JOIN jefe_servicio j ON ra.id_jefe = j.id_jefe
        ORDER BY ra.fecha DESC, ra.check_in DESC
        LIMIT 10
    `;

    db.execute(resumenQuery, (err, resumenResults) => {
        if (err) {
            console.error('Error cargando resumen:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }

        db.execute(registrosQuery, (err, registrosResults) => {
            if (err) {
                console.error('Error cargando últimos registros:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }

            res.json({ 
                success: true, 
                resumen: resumenResults[0],
                ultimosRegistros: registrosResults
            });
        });
    });
});

// Lista de jefes para el administrador
app.get('/api/admin/jefes', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT 
            j.*,
            COUNT(a.id_alumno) as total_alumnos
        FROM jefe_servicio j
        LEFT JOIN alumno a ON j.id_jefe = a.id_jefe AND a.activo = TRUE
        GROUP BY j.id_jefe
        ORDER BY j.nombre_completo
    `;
    
    db.execute(query, (err, results) => {
        if (err) {
            console.error('Error cargando jefes:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, jefes: results });
    });
});

// Lista de alumnos para el administrador
app.get('/api/admin/alumnos', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT 
            a.*,
            j.nombre_completo as jefe_nombre
        FROM alumno a
        LEFT JOIN jefe_servicio j ON a.id_jefe = j.id_jefe
        ORDER BY a.nombre_completo
    `;
    
    db.execute(query, (err, results) => {
        if (err) {
            console.error('Error cargando alumnos:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, alumnos: results });
    });
});

// Obtener un alumno específico
app.get('/api/admin/alumno/:id', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT * FROM alumno 
        WHERE id_alumno = ?
    `;
    
    db.execute(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error cargando alumno:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        
        res.json({ success: true, alumno: results[0] });
    });
});

// En la ruta POST /api/admin/alumno - ACTUALIZAR
app.post('/api/admin/alumno', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { 
        id_alumno, 
        nombre_completo, 
        correo_electronico, 
        carrera, 
        semestre, 
        promedio, 
        tipo_beca, 
        porcentaje_beca, 
        id_jefe 
    } = req.body;

    // Validaciones actualizadas (sin total_horas)
    if (!nombre_completo || !correo_electronico || !carrera || !semestre || !porcentaje_beca) {
        return res.status(400).json({ error: 'Todos los campos obligatorios deben ser llenados' });
    }

    if (id_alumno) {
        // Actualizar alumno existente
        const updateQuery = `
            UPDATE alumno SET 
                nombre_completo = ?,
                correo_electronico = ?,
                carrera = ?,
                semestre = ?,
                promedio = ?,
                tipo_beca = ?,
                porcentaje_beca = ?,
                id_jefe = ?
            WHERE id_alumno = ?
        `;
        
        db.execute(updateQuery, [
            nombre_completo, correo_electronico, carrera, semestre, 
            promedio, tipo_beca, porcentaje_beca, id_jefe, id_alumno
        ], (err, results) => {
            if (err) {
                console.error('Error actualizando alumno:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                }
                return res.status(500).json({ error: 'Error al actualizar alumno' });
            }
            
            res.json({ success: true, message: 'Alumno actualizado correctamente' });
        });
    } else {
        // Crear nuevo alumno
        const insertQuery = `
            INSERT INTO alumno (
                nombre_completo, correo_electronico, carrera, semestre,
                promedio, tipo_beca, porcentaje_beca, id_jefe, password_hash, horas_hechas
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;
        
        // Password temporal
        const passwordHash = '123456';
        
        db.execute(insertQuery, [
            nombre_completo, correo_electronico, carrera, semestre,
            promedio, tipo_beca, porcentaje_beca, id_jefe, passwordHash
        ], (err, results) => {
            if (err) {
                console.error('Error creando alumno:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                }
                return res.status(500).json({ error: 'Error al crear alumno' });
            }
            
            res.json({ success: true, message: 'Alumno creado correctamente' });
        });
    }
});

// Obtener un jefe específico
app.get('/api/admin/jefe/:id', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `SELECT * FROM jefe_servicio WHERE id_jefe = ?`;
    
    db.execute(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error cargando jefe:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Jefe no encontrado' });
        }
        
        res.json({ success: true, jefe: results[0] });
    });
});

// Crear o actualizar jefe
app.post('/api/admin/jefe', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { 
        id_jefe, 
        nombre_completo, 
        correo_electronico, 
        area, 
        ubicacion 
    } = req.body;

    // Validaciones básicas
    if (!nombre_completo || !correo_electronico || !area) {
        return res.status(400).json({ error: 'Todos los campos obligatorios deben ser llenados' });
    }

    if (id_jefe) {
        // Actualizar jefe existente
        const updateQuery = `
            UPDATE jefe_servicio SET 
                nombre_completo = ?,
                correo_electronico = ?,
                area = ?,
                ubicacion = ?
            WHERE id_jefe = ?
        `;
        
        db.execute(updateQuery, [
            nombre_completo, correo_electronico, area, ubicacion, id_jefe
        ], (err, results) => {
            if (err) {
                console.error('Error actualizando jefe:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                }
                return res.status(500).json({ error: 'Error al actualizar jefe' });
            }
            
            res.json({ success: true, message: 'Jefe actualizado correctamente' });
        });
    } else {
        // Crear nuevo jefe
        const insertQuery = `
            INSERT INTO jefe_servicio (
                nombre_completo, correo_electronico, area, ubicacion, password_hash
            ) VALUES (?, ?, ?, ?, ?)
        `;
        
        // Password temporal (en producción usar bcrypt)
        const passwordHash = '123456';
        
        db.execute(insertQuery, [
            nombre_completo, correo_electronico, area, ubicacion, passwordHash
        ], (err, results) => {
            if (err) {
                console.error('Error creando jefe:', err);
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                }
                return res.status(500).json({ error: 'Error al crear jefe' });
            }
            
            res.json({ success: true, message: 'Jefe creado correctamente' });
        });
    }
});

// Activar/desactivar alumno
app.post('/api/admin/toggle-alumno', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id_alumno, activo } = req.body;

    const query = `UPDATE alumno SET activo = ? WHERE id_alumno = ?`;
    
    db.execute(query, [activo, id_alumno], (err, results) => {
        if (err) {
            console.error('Error cambiando estado del alumno:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, message: `Alumno ${activo ? 'activado' : 'desactivado'} correctamente` });
    });
});

// Activar/desactivar jefe
app.post('/api/admin/toggle-jefe', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id_jefe, activo } = req.body;

    const query = `UPDATE jefe_servicio SET activo = ? WHERE id_jefe = ?`;
    
    db.execute(query, [activo, id_jefe], (err, results) => {
        if (err) {
            console.error('Error cambiando estado del jefe:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, message: `Jefe ${activo ? 'activado' : 'desactivado'} correctamente` });
    });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});