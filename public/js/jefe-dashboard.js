class JefeDashboard {
    constructor() {
        this.user = null;
        this.registroSeleccionado = null;
        this.init();
    }

    async init() {
        await this.verificarSesion();
        await this.cargarDatosJefe();
        await this.cargarAlumnos();
        await this.cargarRegistrosPendientes();
        this.setupEventListeners();
    }

    async verificarSesion() {
        try {
            const response = await fetch('/api/sesion');
            const data = await response.json();
            
            if (data.user && data.user.tipo === 'jefe') {
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

    async cargarDatosJefe() {
        try {
            const response = await fetch(`/api/jefe/datos`);
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('userArea').textContent = data.jefe.area;
                this.actualizarResumen(data.resumen);
            }
        } catch (error) {
            console.error('Error cargando datos jefe:', error);
        }
    }

    async cargarAlumnos() {
        try {
            const response = await fetch(`/api/jefe/alumnos`);
            const data = await response.json();
            
            if (data.success) {
                this.mostrarAlumnos(data.alumnos);
            }
        } catch (error) {
            console.error('Error cargando alumnos:', error);
        }
    }

    async cargarRegistrosPendientes() {
        try {
            const response = await fetch(`/api/jefe/registros-pendientes`);
            const data = await response.json();
            
            if (data.success) {
                this.mostrarRegistrosPendientes(data.registros);
            }
        } catch (error) {
            console.error('Error cargando registros pendientes:', error);
        }
    }

    actualizarResumen(resumen) {
        document.getElementById('totalAlumnos').textContent = resumen.totalAlumnos || 0;
        document.getElementById('horasTotales').textContent = resumen.horasTotales || 0;
        document.getElementById('registrosPendientes').textContent = resumen.registrosPendientes || 0;
        document.getElementById('promedioAvance').textContent = resumen.promedioAvance || '0%';
    }

    mostrarAlumnos(alumnos) {
        const tbody = document.getElementById('tbodyAlumnos');
        tbody.innerHTML = '';

        alumnos.forEach(alumno => {
            const row = document.createElement('tr');
            
            // Horas totales ahora = porcentaje de beca
            const totalHoras = alumno.porcentaje_beca;
            const porcentaje = totalHoras > 0 ? 
                Math.round((alumno.horas_hechas / totalHoras) * 100) : 0;
            
            const barraProgreso = `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${porcentaje}%"></div>
                </div>
                <small>${porcentaje}%</small>
            `;

            row.innerHTML = `
                <td>${alumno.nombre_completo}</td>
                <td>${alumno.carrera}</td>
                <td>${alumno.semestre}</td>
                <td>${alumno.horas_hechas || 0}</td>
                <td>${totalHoras} (${alumno.porcentaje_beca}% beca)</td>
                <td>${barraProgreso}</td>
                <td>
                    <button class="btn-small btn-info" onclick="jefeDashboard.verDetallesAlumno(${alumno.id_alumno})">
                        Ver Detalles
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    mostrarRegistrosPendientes(registros) {
        const tbody = document.getElementById('tbodyPendientes');
        tbody.innerHTML = '';

        registros.forEach(registro => {
            const row = document.createElement('tr');
            
            const fecha = new Date(registro.fecha).toLocaleDateString();
            const checkIn = new Date(registro.check_in).toLocaleTimeString();
            const checkOut = registro.check_out ? 
                new Date(registro.check_out).toLocaleTimeString() : '--:--:--';
            const horas = registro.horas_trabajadas || '--';

            row.innerHTML = `
                <td>${registro.alumno_nombre}</td>
                <td>${fecha}</td>
                <td>${checkIn}</td>
                <td>${checkOut}</td>
                <td>${horas}</td>
                <td>
                    <button class="btn-small btn-primary" onclick="jefeDashboard.abrirModalConfirmacion(${registro.id_registro})">
                        Revisar
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    abrirModalConfirmacion(idRegistro) {
        this.registroSeleccionado = idRegistro;
        this.cargarDetallesRegistro(idRegistro);
        document.getElementById('modalRegistro').style.display = 'block';
    }

    async cargarDetallesRegistro(idRegistro) {
        try {
            const response = await fetch(`/api/jefe/registro/${idRegistro}`);
            const data = await response.json();
            
            if (data.success) {
                const registro = data.registro;
                const modalDetalles = document.getElementById('modalDetalles');
                
                const fecha = new Date(registro.fecha).toLocaleDateString();
                const checkIn = new Date(registro.check_in).toLocaleTimeString();
                const checkOut = registro.check_out ? 
                    new Date(registro.check_out).toLocaleTimeString() : 'No registrado';
                const horas = registro.horas_trabajadas || '--';
                
                modalDetalles.innerHTML = `
                    <div class="detalle-registro">
                        <p><strong>Alumno:</strong> ${registro.alumno_nombre}</p>
                        <p><strong>Fecha:</strong> ${fecha}</p>
                        <p><strong>Check-In:</strong> ${checkIn}</p>
                        <p><strong>Check-Out:</strong> ${checkOut}</p>
                        <p><strong>Horas Trabajadas:</strong> ${horas} horas</p>
                        <div class="form-group">
                            <label for="observaciones">Observaciones:</label>
                            <textarea id="observaciones" rows="3" placeholder="Opcional"></textarea>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error cargando detalles del registro:', error);
        }
    }

    async confirmarRegistro() {
        if (!this.registroSeleccionado) return;
        
        const observaciones = document.getElementById('observaciones').value;
        
        try {
            const response = await fetch(`/api/jefe/confirmar-registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_registro: this.registroSeleccionado,
                    confirmar: true,
                    observaciones: observaciones
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Registro confirmado correctamente');
                this.cerrarModal();
                await this.cargarRegistrosPendientes();
                await this.cargarDatosJefe();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error confirmando registro:', error);
            alert('Error de conexión');
        }
    }

    async rechazarRegistro() {
        if (!this.registroSeleccionado) return;
        
        const observaciones = document.getElementById('observaciones').value;
        
        if (!observaciones) {
            alert('Por favor ingresa una observación explicando el motivo del rechazo');
            return;
        }
        
        try {
            const response = await fetch(`/api/jefe/confirmar-registro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_registro: this.registroSeleccionado,
                    confirmar: false,
                    observaciones: observaciones
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Registro rechazado correctamente');
                this.cerrarModal();
                await this.cargarRegistrosPendientes();
                await this.cargarDatosJefe();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error rechazando registro:', error);
            alert('Error de conexión');
        }
    }

    cerrarModal() {
        document.getElementById('modalRegistro').style.display = 'none';
        this.registroSeleccionado = null;
    }

    setupEventListeners() {
        document.getElementById('btnLogout').addEventListener('click', () => {
            this.cerrarSesion();
        });

        // Modal events
        document.querySelector('.close').addEventListener('click', () => {
            this.cerrarModal();
        });

        document.getElementById('btnConfirmar').addEventListener('click', () => {
            this.confirmarRegistro();
        });

        document.getElementById('btnRechazar').addEventListener('click', () => {
            this.rechazarRegistro();
        });

        document.getElementById('btnCancelar').addEventListener('click', () => {
            this.cerrarModal();
        });

        // Cerrar modal al hacer click fuera
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('modalRegistro');
            if (event.target === modal) {
                this.cerrarModal();
            }
        });
    }

    verDetallesAlumno(idAlumno) {
        // Aquí podrías implementar un modal con detalles específicos del alumno
        alert(`Funcionalidad para ver detalles del alumno ${idAlumno} - Podemos implementarla después`);
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

// CSS adicional para el dashboard del jefe
const style = document.createElement('style');
style.textContent = `
    .area-badge {
        background: #667eea;
        color: white;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 0.9em;
    }

    .progress-bar {
        width: 100px;
        height: 10px;
        background: #f0f0f0;
        border-radius: 5px;
        display: inline-block;
        margin-right: 10px;
    }

    .progress-fill {
        height: 100%;
        background: #28a745;
        border-radius: 5px;
        transition: width 0.3s;
    }

    .btn-small {
        padding: 5px 10px;
        font-size: 0.8em;
        border: none;
        border-radius: 3px;
        cursor: pointer;
    }

    .btn-info {
        background: #17a2b8;
        color: white;
    }

    .modal {
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
    }

    .modal-content {
        background-color: white;
        margin: 10% auto;
        padding: 20px;
        border-radius: 10px;
        width: 90%;
        max-width: 500px;
        position: relative;
    }

    .close {
        color: #aaa;
        float: right;
        font-size: 28px;
        font-weight: bold;
        cursor: pointer;
    }

    .close:hover {
        color: black;
    }

    .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
    }

    .btn-cancel {
        background: #6c757d;
        color: white;
        border: none;
        padding: 10px 15px;
        border-radius: 5px;
        cursor: pointer;
    }

    .detalle-registro p {
        margin: 10px 0;
    }
`;
document.head.appendChild(style);

// Inicializar dashboard
let jefeDashboard;
document.addEventListener('DOMContentLoaded', () => {
    jefeDashboard = new JefeDashboard();
});