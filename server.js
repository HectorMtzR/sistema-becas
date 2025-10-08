// ==================== CONFIGURACIÓN INICIAL ====================
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ==================== CONFIGURACIÓN DE SEGURIDAD ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configuración de sesión mejorada para producción
app.use(session({
    secret: process.env.SESSION_SECRET || 'clave-secreta-anahuac-produccion-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// ==================== CONEXIÓN A BASE DE DATOS ====================
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sistema_sb',
    // Configuraciones para producción
    acquireTimeout: 60000,
    connectTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

console.log('🔧 Configuración BD:', {
    host: dbConfig.host,
    user: dbConfig.user, 
    database: dbConfig.database,
    environment: process.env.NODE_ENV
});

const db = mysql.createConnection(dbConfig);

// Manejo mejorado de conexión a BD
db.connect((err) => {
    if (err) {
        console.error('❌ Error conectando a MySQL:', err.message);
        if (process.env.NODE_ENV === 'production') {
            console.log('🔄 En producción, el servidor continuará ejecutándose');
        } else {
            process.exit(1);
        }
        return;
    }
    console.log('✅ Conectado a MySQL correctamente');
});

// Manejo de errores de conexión
db.on('error', (err) => {
    console.error('❌ Error de conexión MySQL:', err.message);
});

// ==================== MIDDLEWARE DE AUTENTICACIÓN ====================
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    next();
};

// ==================== RUTAS PRINCIPALES ====================

// Health check para Railway
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        database: 'Connected'
    });
});

// Ruta de inicio
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// ==================== RUTAS DE AUTENTICACIÓN ====================

// Ruta de login automático
app.post('/api/login-auto', async (req, res) => {
    const { correo, password } = req.body;
    
    console.log('🔐 Intento de login:', { correo });
    
    if (!correo || !password) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }
    
    const tables = [
        { name: 'alumno', tipo: 'alumno', idField: 'id_alumno', hasActive: true },
        { name: 'jefe_servicio', tipo: 'jefe', idField: 'id_jefe', hasActive: true },
        { name: 'administrador', tipo: 'admin', idField: 'id_admin', hasActive: false }
    ];
    
    let userFound = null;
    let userType = null;
    
    const searchInTable = (table) => {
        return new Promise((resolve, reject) => {
            let query = `SELECT * FROM ${table.name} WHERE correo_electronico = ?`;
            if (table.hasActive) {
                query += ' AND activo = TRUE';
            }
            
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
        for (const table of tables) {
            const result = await searchInTable(table);
            if (result) {
                userFound = result.user;
                userType = result.tipo;
                break;
            }
        }
        
        if (!userFound) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }
        
        const validPassword = await bcrypt.compare(password, userFound.password_hash);
        
        if (validPassword) {
            req.session.user = {
                id: userFound[userType === 'alumno' ? 'id_alumno' : userType === 'jefe' ? 'id_jefe' : 'id_admin'],
                nombre: userFound.nombre_completo,
                correo: userFound.correo_electronico,
                tipo: userType
            };
            
            console.log('✅ Login exitoso:', { usuario: req.session.user.nombre, tipo: req.session.user.tipo });
            
            res.json({ 
                success: true, 
                user: req.session.user,
                message: `Bienvenido ${userFound.nombre_completo}`
            });
        } else {
            res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: 'Error del servidor' });
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

// ==================== RUTAS DE DASHBOARD ====================

app.get('/alumno/dashboard', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'alumno-dashboard.html'));
});

app.get('/jefe/dashboard', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'jefe-dashboard.html'));
});

app.get('/admin/dashboard', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') return res.redirect('/');
    res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// ==================== RUTAS DE ALUMNO ====================

app.get('/api/alumno/datos', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT 
            a.*, 
            j.nombre_completo as jefe_nombre, 
            j.area,
            a.porcentaje_beca as total_horas
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
        const porcentaje = alumno.porcentaje_beca > 0 ? 
            Math.round((alumno.horas_hechas / alumno.porcentaje_beca) * 100) : 0;
        
        res.json({ 
            success: true, 
            alumno: {
                ...alumno,
                total_horas: alumno.porcentaje_beca,
                porcentaje_completado: porcentaje
            }
        });
    });
});

app.get('/api/alumno/asistencias', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `SELECT * FROM registro_asistencia WHERE id_alumno = ? ORDER BY fecha DESC, check_in DESC LIMIT 20`;
    
    db.execute(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Error cargando asistencias:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, asistencias: results });
    });
});

app.get('/api/alumno/sesion-activa', requireAuth, (req, res) => {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const query = `SELECT * FROM registro_asistencia WHERE id_alumno = ? AND fecha = ? AND check_out IS NULL`;
    
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

app.post('/api/alumno/checkin', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const checkQuery = `SELECT * FROM registro_asistencia WHERE id_alumno = ? AND fecha = ? AND check_out IS NULL`;
    
    db.execute(checkQuery, [req.session.user.id, fechaHoy], (err, results) => {
        if (err) {
            console.error('Error verificando check-in:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Ya tienes un check-in activo para hoy' });
        }
        
        const alumnoQuery = `SELECT id_jefe FROM alumno WHERE id_alumno = ?`;
        
        db.execute(alumnoQuery, [req.session.user.id], (err, alumnoResults) => {
            if (err || alumnoResults.length === 0) {
                return res.status(500).json({ error: 'Error obteniendo datos del alumno' });
            }
            
            const idJefe = alumnoResults[0].id_jefe;
            const insertQuery = `INSERT INTO registro_asistencia (id_alumno, id_jefe, fecha, check_in) VALUES (?, ?, ?, NOW())`;
            
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

app.post('/api/alumno/checkout', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'alumno') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const findQuery = `SELECT * FROM registro_asistencia WHERE id_alumno = ? AND fecha = ? AND check_out IS NULL`;
    
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
        const diffMs = checkOut - checkIn;
        const horasTrabajadas = (diffMs / (1000 * 60 * 60)).toFixed(2);
        
        const updateQuery = `UPDATE registro_asistencia SET check_out = NOW(), horas_trabajadas = ? WHERE id_registro = ?`;
        
        db.execute(updateQuery, [horasTrabajadas, registro.id_registro], (err, results) => {
            if (err) {
                console.error('Error registrando check-out:', err);
                return res.status(500).json({ error: 'Error al registrar check-out' });
            }
            
            res.json({ success: true, message: 'Check-out registrado', horas: horasTrabajadas });
        });
    });
});

// ==================== RUTAS DE JEFE ====================

app.get('/api/jefe/datos', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const jefeQuery = `SELECT * FROM jefe_servicio WHERE id_jefe = ?`;
    
    db.execute(jefeQuery, [req.session.user.id], (err, jefeResults) => {
        if (err) {
            console.error('Error cargando datos jefe:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        if (jefeResults.length === 0) {
            return res.status(404).json({ error: 'Jefe no encontrado' });
        }
        
        const resumenQuery = `
            SELECT 
                COUNT(*) as totalAlumnos,
                COALESCE(SUM(a.horas_hechas), 0) as horasTotales,
                COUNT(ra.id_registro) as registrosPendientes
            FROM alumno a
            LEFT JOIN registro_asistencia ra ON a.id_alumno = ra.id_alumno AND ra.confirmacion = FALSE AND ra.check_out IS NOT NULL
            WHERE a.id_jefe = ? AND a.activo = TRUE
        `;
        
        db.execute(resumenQuery, [req.session.user.id], (err, resumenResults) => {
            if (err) {
                console.error('Error cargando resumen:', err);
                return res.status(500).json({ error: 'Error del servidor' });
            }
            
            res.json({ 
                success: true, 
                jefe: jefeResults[0],
                resumen: resumenResults[0] 
            });
        });
    });
});

app.get('/api/jefe/alumnos', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `SELECT * FROM alumno WHERE id_jefe = ? AND activo = TRUE ORDER BY nombre_completo`;
    
    db.execute(query, [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Error cargando alumnos:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, alumnos: results });
    });
});

app.get('/api/jefe/registros-pendientes', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT ra.*, a.nombre_completo as alumno_nombre
        FROM registro_asistencia ra
        JOIN alumno a ON ra.id_alumno = a.id_alumno
        WHERE ra.id_jefe = ? AND ra.check_out IS NOT NULL AND ra.confirmacion = FALSE
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

app.get('/api/jefe/registro/:id', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT ra.*, a.nombre_completo as alumno_nombre, a.carrera, a.semestre
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

app.post('/api/jefe/confirmar-registro', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'jefe') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id_registro, confirmar, observaciones } = req.body;
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
            const updateQuery = `UPDATE registro_asistencia SET confirmacion = TRUE, observaciones = ? WHERE id_registro = ?`;
            
            db.execute(updateQuery, [observaciones, id_registro], (err, results) => {
                if (err) {
                    console.error('Error confirmando registro:', err);
                    return res.status(500).json({ error: 'Error al confirmar registro' });
                }
                
                const horasQuery = `UPDATE alumno SET horas_hechas = horas_hechas + ? WHERE id_alumno = ?`;
                
                db.execute(horasQuery, [registro.horas_trabajadas, registro.id_alumno], (err, results) => {
                    if (err) console.error('Error actualizando horas:', err);
                    res.json({ success: true, message: 'Registro confirmado' });
                });
            });
        } else {
            const updateQuery = `UPDATE registro_asistencia SET confirmacion = FALSE, observaciones = ? WHERE id_registro = ?`;
            
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

// ==================== RUTAS DE ADMINISTRADOR ====================

app.get('/api/admin/resumen', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const resumenQuery = `
        SELECT 
            (SELECT COUNT(*) FROM alumno WHERE activo = TRUE) as totalAlumnos,
            (SELECT COUNT(*) FROM jefe_servicio WHERE activo = TRUE) as totalJefes,
            (SELECT COALESCE(SUM(horas_hechas), 0) FROM alumno) as totalHoras,
            (SELECT COUNT(*) FROM registro_asistencia WHERE confirmacion = FALSE AND check_out IS NOT NULL) as totalPendientes
    `;
    
    const registrosQuery = `
        SELECT ra.*, a.nombre_completo as alumno_nombre, j.nombre_completo as jefe_nombre
        FROM registro_asistencia ra
        JOIN alumno a ON ra.id_alumno = a.id_alumno
        JOIN jefe_servicio j ON ra.id_jefe = j.id_jefe
        ORDER BY ra.fecha DESC, ra.check_in DESC LIMIT 10
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

app.get('/api/admin/jefes', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `
        SELECT j.*, COUNT(a.id_alumno) as total_alumnos
        FROM jefe_servicio j
        LEFT JOIN alumno a ON j.id_jefe = a.id_jefe AND a.activo = TRUE
        GROUP BY j.id_jefe ORDER BY j.nombre_completo
    `;
    
    db.execute(query, (err, results) => {
        if (err) {
            console.error('Error cargando jefes:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, jefes: results });
    });
});

app.get('/api/admin/alumnos', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `SELECT a.*, j.nombre_completo as jefe_nombre FROM alumno a LEFT JOIN jefe_servicio j ON a.id_jefe = j.id_jefe ORDER BY a.nombre_completo`;
    
    db.execute(query, (err, results) => {
        if (err) {
            console.error('Error cargando alumnos:', err);
            return res.status(500).json({ error: 'Error del servidor' });
        }
        
        res.json({ success: true, alumnos: results });
    });
});

app.get('/api/admin/alumno/:id', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const query = `SELECT * FROM alumno WHERE id_alumno = ?`;
    
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

app.post('/api/admin/alumno', requireAuth, async (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id_alumno, nombre_completo, correo_electronico, carrera, semestre, promedio, tipo_beca, porcentaje_beca, id_jefe, password } = req.body;

    if (!nombre_completo || !correo_electronico || !carrera || !semestre || !porcentaje_beca) {
        return res.status(400).json({ error: 'Todos los campos obligatorios deben ser llenados' });
    }

    try {
        if (id_alumno) {
            let updateQuery, queryParams;
            
            if (password) {
                const passwordHash = await bcrypt.hash(password, 10);
                updateQuery = `UPDATE alumno SET nombre_completo=?, correo_electronico=?, carrera=?, semestre=?, promedio=?, tipo_beca=?, porcentaje_beca=?, id_jefe=?, password_hash=? WHERE id_alumno=?`;
                queryParams = [nombre_completo, correo_electronico, carrera, semestre, promedio, tipo_beca, porcentaje_beca, id_jefe, passwordHash, id_alumno];
            } else {
                updateQuery = `UPDATE alumno SET nombre_completo=?, correo_electronico=?, carrera=?, semestre=?, promedio=?, tipo_beca=?, porcentaje_beca=?, id_jefe=? WHERE id_alumno=?`;
                queryParams = [nombre_completo, correo_electronico, carrera, semestre, promedio, tipo_beca, porcentaje_beca, id_jefe, id_alumno];
            }
            
            db.execute(updateQuery, queryParams, (err, results) => {
                if (err) {
                    console.error('Error actualizando alumno:', err);
                    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                    return res.status(500).json({ error: 'Error al actualizar alumno' });
                }
                
                res.json({ success: true, message: 'Alumno actualizado correctamente' });
            });
        } else {
            if (!password) return res.status(400).json({ error: 'La contraseña es requerida para nuevos alumnos' });
            
            const passwordHash = await bcrypt.hash(password, 10);
            const insertQuery = `INSERT INTO alumno (nombre_completo, correo_electronico, carrera, semestre, promedio, tipo_beca, porcentaje_beca, id_jefe, password_hash, horas_hechas) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`;
            
            db.execute(insertQuery, [nombre_completo, correo_electronico, carrera, semestre, promedio, tipo_beca, porcentaje_beca, id_jefe, passwordHash], (err, results) => {
                if (err) {
                    console.error('Error creando alumno:', err);
                    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                    return res.status(500).json({ error: 'Error al crear alumno' });
                }
                
                res.json({ success: true, message: 'Alumno creado correctamente', password_generated: password });
            });
        }
    } catch (error) {
        console.error('Error en operación de alumno:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

app.post('/api/admin/jefe', requireAuth, async (req, res) => {
    if (req.session.user.tipo !== 'admin') {
        return res.status(403).json({ error: 'No autorizado' });
    }

    const { id_jefe, nombre_completo, correo_electronico, area, ubicacion, password } = req.body;

    if (!nombre_completo || !correo_electronico || !area) {
        return res.status(400).json({ error: 'Todos los campos obligatorios deben ser llenados' });
    }

    try {
        if (id_jefe) {
            let updateQuery, queryParams;
            
            if (password) {
                const passwordHash = await bcrypt.hash(password, 10);
                updateQuery = `UPDATE jefe_servicio SET nombre_completo=?, correo_electronico=?, area=?, ubicacion=?, password_hash=? WHERE id_jefe=?`;
                queryParams = [nombre_completo, correo_electronico, area, ubicacion, passwordHash, id_jefe];
            } else {
                updateQuery = `UPDATE jefe_servicio SET nombre_completo=?, correo_electronico=?, area=?, ubicacion=? WHERE id_jefe=?`;
                queryParams = [nombre_completo, correo_electronico, area, ubicacion, id_jefe];
            }
            
            db.execute(updateQuery, queryParams, (err, results) => {
                if (err) {
                    console.error('Error actualizando jefe:', err);
                    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                    return res.status(500).json({ error: 'Error al actualizar jefe' });
                }
                
                res.json({ success: true, message: 'Jefe actualizado correctamente' });
            });
        } else {
            if (!password) return res.status(400).json({ error: 'La contraseña es requerida para nuevos jefes' });
            
            const passwordHash = await bcrypt.hash(password, 10);
            const insertQuery = `INSERT INTO jefe_servicio (nombre_completo, correo_electronico, area, ubicacion, password_hash) VALUES (?, ?, ?, ?, ?)`;
            
            db.execute(insertQuery, [nombre_completo, correo_electronico, area, ubicacion, passwordHash], (err, results) => {
                if (err) {
                    console.error('Error creando jefe:', err);
                    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
                    return res.status(500).json({ error: 'Error al crear jefe' });
                }
                
                res.json({ success: true, message: 'Jefe creado correctamente', password_generated: password });
            });
        }
    } catch (error) {
        console.error('Error en operación de jefe:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

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

app.post('/api/admin/toggle-alumno', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') return res.status(403).json({ error: 'No autorizado' });
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

app.post('/api/admin/toggle-jefe', requireAuth, (req, res) => {
    if (req.session.user.tipo !== 'admin') return res.status(403).json({ error: 'No autorizado' });
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

// ==================== MANEJO DE ERRORES ====================

// Ruta 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
    console.error('❌ Error global:', err);
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message 
    });
});

// ==================== INICIO DEL SERVIDOR ====================
app.listen(port, '0.0.0.0', () => {
    console.log('🚀 ===========================================');
    console.log('🚀 Sistema de Becas Anáhuac - PRODUCCIÓN');
    console.log('🚀 ===========================================');
    console.log(`🌍 Servidor corriendo en puerto: ${port}`);
    console.log(`⚙️  Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Base de datos: ${dbConfig.database}`);
    console.log(`🏠 URL: http://localhost:${port}`);
    console.log('❤️  Salud del sistema: http://localhost:' + port + '/health');
    console.log('🚀 ===========================================');
});