class AlumnoDashboard {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        await this.verificarSesion();
        await this.cargarDatosAlumno();
        await this.cargarAsistencias();
        this.setupEventListeners();
    }

    async verificarSesion() {
        try {
            const response = await fetch('/api/sesion');
            const data = await response.json();
            
            if (data.user && data.user.tipo === 'alumno') {
                this.user = data.user;
                document.getElementById('userName').textContent = this.user.nombre;
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Error verificando sesión:', error);
            window.location.href = '/';
        }
    }

    async cargarDatosAlumno() {
        try {
            const response = await fetch(`/api/alumno/datos`);
            const data = await response.json();
            
            if (data.success) {
                this.actualizarUI(data.alumno);
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    }

    async cargarAsistencias() {
        try {
            const response = await fetch(`/api/alumno/asistencias`);
            const data = await response.json();
            
            if (data.success) {
                this.mostrarAsistencias(data.asistencias);
            }
        } catch (error) {
            console.error('Error cargando asistencias:', error);
        }
    }

    actualizarUI(alumno) {
        document.getElementById('horasHechas').textContent = alumno.horas_hechas || 0;
        
        // Ahora total_horas es igual al porcentaje de beca
        const totalHoras = alumno.porcentaje_beca;
        document.getElementById('totalHoras').textContent = totalHoras;
        
        const porcentaje = totalHoras > 0 ? 
            Math.round((alumno.horas_hechas / totalHoras) * 100) : 0;
        document.getElementById('porcentaje').textContent = porcentaje + '%';
        
        // Opcional: Mostrar alerta si está cerca de completar
        if (porcentaje >= 80 && porcentaje < 100) {
            this.mostrarAlertaProgreso(porcentaje);
        }
    }

    mostrarAlertaProgreso(porcentaje) {
        const alerta = document.createElement('div');
        alerta.className = 'alerta-progreso';
        alerta.innerHTML = `
            <strong>¡Buen trabajo!</strong> Has completado el ${porcentaje}% de tus horas de servicio.
            <button onclick="this.parentElement.remove()">×</button>
        `;
        alerta.style.cssText = `
            background: #d4edda;
            color: #155724;
            padding: 12px;
            border-radius: 5px;
            margin: 10px 0;
            border: 1px solid #c3e6cb;
            position: relative;
        `;
        alerta.querySelector('button').style.cssText = `
            background: none;
            border: none;
            font-size: 18px;
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            cursor: pointer;
        `;
        
        document.querySelector('main').insertBefore(alerta, document.querySelector('main').firstChild);
    }

    mostrarAsistencias(asistencias) {
        const tbody = document.getElementById('tbodyAsistencias');
        tbody.innerHTML = '';

        let pendientes = 0;

        asistencias.forEach(asistencia => {
            const row = document.createElement('tr');
            
            const fecha = new Date(asistencia.fecha).toLocaleDateString();
            const checkIn = new Date(asistencia.check_in).toLocaleTimeString();
            const checkOut = asistencia.check_out ? 
                new Date(asistencia.check_out).toLocaleTimeString() : '--:--:--';
            const horas = asistencia.horas_trabajadas || '--';
            
            let estadoClass = 'estado-pendiente';
            let estadoText = 'Pendiente';
            
            if (asistencia.confirmacion) {
                estadoClass = 'estado-confirmado';
                estadoText = 'Confirmado';
            } else if (asistencia.check_out && !asistencia.confirmacion) {
                pendientes++;
            }

            row.innerHTML = `
                <td>${fecha}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td>${horas}</td>
                <td class="${estadoClass}">${estadoText}</td>
            `;
            
            tbody.appendChild(row);
        });

        document.getElementById('pendientes').textContent = pendientes;
    }

    setupEventListeners() {
        document.getElementById('btnLogout').addEventListener('click', () => {
            this.cerrarSesion();
        });

        document.getElementById('btnCheckin').addEventListener('click', () => {
            this.registrarCheckin();
        });

        document.getElementById('btnCheckout').addEventListener('click', () => {
            this.registrarCheckout();
        });

        // Verificar si hay sesión activa
        this.verificarSesionActiva();
    }

    async verificarSesionActiva() {
        try {
            const response = await fetch('/api/alumno/sesion-activa');
            const data = await response.json();
            
            if (data.sesionActiva) {
                this.mostrarSesionActiva(data.registro);
            }
        } catch (error) {
            console.error('Error verificando sesión activa:', error);
        }
    }

    mostrarSesionActiva(registro) {
        document.getElementById('btnCheckin').disabled = true;
        document.getElementById('btnCheckout').disabled = false;
        
        const sessionDiv = document.getElementById('currentSession');
        const sessionStart = document.getElementById('sessionStart');
        
        sessionStart.textContent = new Date(registro.check_in).toLocaleTimeString();
        sessionDiv.style.display = 'block';
    }

    async registrarCheckin() {
        try {
            const response = await fetch('/api/alumno/checkin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Check-in registrado correctamente');
                this.verificarSesionActiva();
                this.cargarAsistencias();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error en check-in:', error);
            alert('Error de conexión');
        }
    }

    async registrarCheckout() {
        try {
            const response = await fetch('/api/alumno/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Check-out registrado correctamente');
                document.getElementById('btnCheckin').disabled = false;
                document.getElementById('btnCheckout').disabled = true;
                document.getElementById('currentSession').style.display = 'none';
                this.cargarDatosAlumno();
                this.cargarAsistencias();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error en check-out:', error);
            alert('Error de conexión');
        }
    }

    async cerrarSesion() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            window.location.href = '/';
        }
    }
}

// Inicializar dashboard cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new AlumnoDashboard();
});