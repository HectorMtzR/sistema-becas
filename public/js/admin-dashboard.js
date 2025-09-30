class AdminDashboard {
    constructor() {
        this.user = null;
        this.jefes = [];
        this.init();
    }

    async init() {
        await this.verificarSesion();
        await this.cargarJefes();
        this.setupEventListeners();
        this.mostrarTab('resumen');
        await this.cargarResumenGeneral();
    }

    async verificarSesion() {
        try {
            const response = await fetch('/api/sesion');
            const data = await response.json();
            
            if (data.user && data.user.tipo === 'admin') {
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

    async cargarJefes() {
        try {
            const response = await fetch('/api/admin/jefes');
            const data = await response.json();
            
            if (data.success) {
                this.jefes = data.jefes;
                this.actualizarSelectJefes();
            }
        } catch (error) {
            console.error('Error cargando jefes:', error);
        }
    }

    actualizarSelectJefes() {
        const selectJefe = document.getElementById('alumnoJefe');
        const selectFiltroJefe = document.getElementById('filtroJefe');
        
        // Limpiar selects
        selectJefe.innerHTML = '<option value="">Sin asignar</option>';
        selectFiltroJefe.innerHTML = '<option value="">Todos los jefes</option>';
        
        this.jefes.forEach(jefe => {
            if (jefe.activo) {
                const option = `<option value="${jefe.id_jefe}">${jefe.nombre_completo} - ${jefe.area}</option>`;
                selectJefe.innerHTML += option;
                selectFiltroJefe.innerHTML += option;
            }
        });
    }

    setupEventListeners() {
        document.getElementById('btnLogout').addEventListener('click', () => {
            this.cerrarSesion();
        });

        // Navegación entre pestañas
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.mostrarTab(tab);
            });
        });

        // Modal alumnos
        document.getElementById('btnNuevoAlumno').addEventListener('click', () => {
            this.abrirModalAlumno();
        });

        document.getElementById('formAlumno').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarAlumno();
        });

        // Modal jefes
        document.getElementById('btnNuevoJefe').addEventListener('click', () => {
            this.abrirModalJefe();
        });

        document.getElementById('formJefe').addEventListener('submit', (e) => {
            e.preventDefault();
            this.guardarJefe();
        });

        // Filtros
        document.getElementById('filtroAlumnos').addEventListener('input', () => {
            this.filtrarAlumnos();
        });

        document.getElementById('filtroJefe').addEventListener('change', () => {
            this.filtrarAlumnos();
        });

        // Cerrar modales
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Cerrar modales al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    mostrarTab(tabName) {
        // Ocultar todas las pestañas
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Desactivar todos los botones
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Mostrar pestaña seleccionada
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Cargar datos específicos de la pestaña
        switch(tabName) {
            case 'gestion-alumnos':
                this.cargarGestionAlumnos();
                break;
            case 'gestion-jefes':
                this.cargarGestionJefes();
                break;
            case 'reportes':
                // Puedes cargar datos de reportes aquí si es necesario
                break;
        }
    }

    async cargarResumenGeneral() {
        try {
            const response = await fetch('/api/admin/resumen');
            const data = await response.json();
            
            if (data.success) {
                this.actualizarResumen(data.resumen);
                this.mostrarUltimosRegistros(data.ultimosRegistros);
            }
        } catch (error) {
            console.error('Error cargando resumen:', error);
        }
    }

    actualizarResumen(resumen) {
        document.getElementById('totalAlumnosSistema').textContent = resumen.totalAlumnos || 0;
        document.getElementById('totalJefesSistema').textContent = resumen.totalJefes || 0;
        document.getElementById('totalHorasSistema').textContent = resumen.totalHoras || 0;
        document.getElementById('totalPendientesSistema').textContent = resumen.totalPendientes || 0;
    }

    mostrarUltimosRegistros(registros) {
        const tbody = document.getElementById('tbodyUltimosRegistros');
        tbody.innerHTML = '';

        registros.forEach(registro => {
            const row = document.createElement('tr');
            
            const fecha = new Date(registro.fecha).toLocaleDateString();
            const horas = registro.horas_trabajadas || '--';
            
            let estadoClass = 'estado-pendiente';
            let estadoText = 'Pendiente';
            
            if (registro.confirmacion) {
                estadoClass = 'estado-confirmado';
                estadoText = 'Confirmado';
            }

            row.innerHTML = `
                <td>${registro.alumno_nombre}</td>
                <td>${registro.jefe_nombre}</td>
                <td>${fecha}</td>
                <td>${horas}</td>
                <td class="${estadoClass}">${estadoText}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    async cargarGestionAlumnos() {
        try {
            const response = await fetch('/api/admin/alumnos');
            const data = await response.json();
            
            if (data.success) {
                this.mostrarAlumnosGestion(data.alumnos);
            }
        } catch (error) {
            console.error('Error cargando alumnos para gestión:', error);
        }
    }

    // En mostrarAlumnosGestion
    mostrarAlumnosGestion(alumnos) {
        const tbody = document.getElementById('tbodyGestionAlumnos');
        tbody.innerHTML = '';

        alumnos.forEach(alumno => {
            const row = document.createElement('tr');
            
            // Horas totales ahora = porcentaje de beca
            const totalHoras = alumno.porcentaje_beca;
            const porcentaje = totalHoras > 0 ? 
                Math.round((alumno.horas_hechas / totalHoras) * 100) : 0;
            
            const progreso = `${alumno.horas_hechas || 0} / ${totalHoras} (${porcentaje}%)`;
            
            row.innerHTML = `
                <td>${alumno.nombre_completo}</td>
                <td>${alumno.correo_electronico}</td>
                <td>${alumno.carrera}</td>
                <td>${alumno.semestre}</td>
                <td>${alumno.jefe_nombre || 'No asignado'}</td>
                <td>${progreso}</td>
                <td class="${alumno.activo ? 'estado-activo' : 'estado-inactivo'}">
                    ${alumno.activo ? 'Activo' : 'Inactivo'}
                </td>
                <td>
                    <button class="btn-small btn-warning" onclick="adminDashboard.editarAlumno(${alumno.id_alumno})">
                        Editar
                    </button>
                    <button class="btn-small ${alumno.activo ? 'btn-danger' : 'btn-success'}" 
                            onclick="adminDashboard.toggleAlumno(${alumno.id_alumno}, ${!alumno.activo})">
                        ${alumno.activo ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    // En el modal de alumno, quitar el campo total_horas y hacer porcentaje_beca requerido
    abrirModalAlumno(alumno = null) {
        const modal = document.getElementById('modalAlumno');
        const titulo = document.getElementById('modalAlumnoTitulo');
        const form = document.getElementById('formAlumno');
        
        form.reset();
        
        if (alumno) {
            titulo.textContent = 'Editar Alumno';
            document.getElementById('alumnoId').value = alumno.id_alumno;
            document.getElementById('alumnoNombre').value = alumno.nombre_completo;
            document.getElementById('alumnoCorreo').value = alumno.correo_electronico;
            document.getElementById('alumnoCarrera').value = alumno.carrera;
            document.getElementById('alumnoSemestre').value = alumno.semestre;
            document.getElementById('alumnoPromedio').value = alumno.promedio || '';
            document.getElementById('alumnoTipoBeca').value = alumno.tipo_beca || 'Académica';
            document.getElementById('alumnoPorcentajeBeca').value = alumno.porcentaje_beca || '';
            document.getElementById('alumnoJefe').value = alumno.id_jefe || '';
        } else {
            titulo.textContent = 'Nuevo Alumno';
            document.getElementById('alumnoId').value = '';
        }
        
        modal.style.display = 'block';
    }

    async cargarGestionJefes() {
        try {
            const response = await fetch('/api/admin/jefes');
            const data = await response.json();
            
            if (data.success) {
                this.mostrarJefesGestion(data.jefes);
            }
        } catch (error) {
            console.error('Error cargando jefes para gestión:', error);
        }
    }

    mostrarJefesGestion(jefes) {
        const tbody = document.getElementById('tbodyGestionJefes');
        tbody.innerHTML = '';

        jefes.forEach(jefe => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${jefe.nombre_completo}</td>
                <td>${jefe.correo_electronico}</td>
                <td>${jefe.area}</td>
                <td>${jefe.ubicacion || '--'}</td>
                <td>${jefe.total_alumnos || 0}</td>
                <td class="${jefe.activo ? 'estado-activo' : 'estado-inactivo'}">
                    ${jefe.activo ? 'Activo' : 'Inactivo'}
                </td>
                <td>
                    <button class="btn-small btn-warning" onclick="adminDashboard.editarJefe(${jefe.id_jefe})">
                        Editar
                    </button>
                    <button class="btn-small ${jefe.activo ? 'btn-danger' : 'btn-success'}" 
                            onclick="adminDashboard.toggleJefe(${jefe.id_jefe}, ${!jefe.activo})">
                        ${jefe.activo ? 'Desactivar' : 'Activar'}
                    </button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
    }

    abrirModalAlumno(alumno = null) {
        const modal = document.getElementById('modalAlumno');
        const titulo = document.getElementById('modalAlumnoTitulo');
        const form = document.getElementById('formAlumno');
        
        form.reset();
        
        if (alumno) {
            titulo.textContent = 'Editar Alumno';
            document.getElementById('alumnoId').value = alumno.id_alumno;
            document.getElementById('alumnoNombre').value = alumno.nombre_completo;
            document.getElementById('alumnoCorreo').value = alumno.correo_electronico;
            document.getElementById('alumnoCarrera').value = alumno.carrera;
            document.getElementById('alumnoSemestre').value = alumno.semestre;
            document.getElementById('alumnoPromedio').value = alumno.promedio || '';
            document.getElementById('alumnoTipoBeca').value = alumno.tipo_beca || 'Académica';
            document.getElementById('alumnoPorcentajeBeca').value = alumno.porcentaje_beca || '';
            document.getElementById('alumnoTotalHoras').value = alumno.total_horas;
            document.getElementById('alumnoJefe').value = alumno.id_jefe || '';
        } else {
            titulo.textContent = 'Nuevo Alumno';
            document.getElementById('alumnoId').value = '';
        }
        
        modal.style.display = 'block';
    }

    async editarAlumno(idAlumno) {
        try {
            const response = await fetch(`/api/admin/alumno/${idAlumno}`);
            const data = await response.json();
            
            if (data.success) {
                this.abrirModalAlumno(data.alumno);
            }
        } catch (error) {
            console.error('Error cargando alumno:', error);
            alert('Error al cargar datos del alumno');
        }
    }

    async guardarAlumno() {
        const formData = {
            id_alumno: document.getElementById('alumnoId').value || null,
            nombre_completo: document.getElementById('alumnoNombre').value,
            correo_electronico: document.getElementById('alumnoCorreo').value,
            carrera: document.getElementById('alumnoCarrera').value,
            semestre: document.getElementById('alumnoSemestre').value,
            promedio: document.getElementById('alumnoPromedio').value || null,
            tipo_beca: document.getElementById('alumnoTipoBeca').value,
            porcentaje_beca: document.getElementById('alumnoPorcentajeBeca').value || null,
            total_horas: document.getElementById('alumnoTotalHoras').value,
            id_jefe: document.getElementById('alumnoJefe').value || null
        };
        
        try {
            const response = await fetch('/api/admin/alumno', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Alumno guardado correctamente');
                this.cerrarModalAlumno();
                this.cargarGestionAlumnos();
                this.cargarResumenGeneral();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error guardando alumno:', error);
            alert('Error de conexión');
        }
    }

    cerrarModalAlumno() {
        document.getElementById('modalAlumno').style.display = 'none';
    }

    abrirModalJefe(jefe = null) {
        const modal = document.getElementById('modalJefe');
        const titulo = document.getElementById('modalJefeTitulo');
        const form = document.getElementById('formJefe');
        
        form.reset();
        
        if (jefe) {
            titulo.textContent = 'Editar Jefe de Servicio';
            document.getElementById('jefeId').value = jefe.id_jefe;
            document.getElementById('jefeNombre').value = jefe.nombre_completo;
            document.getElementById('jefeCorreo').value = jefe.correo_electronico;
            document.getElementById('jefeArea').value = jefe.area;
            document.getElementById('jefeUbicacion').value = jefe.ubicacion || '';
        } else {
            titulo.textContent = 'Nuevo Jefe de Servicio';
            document.getElementById('jefeId').value = '';
        }
        
        modal.style.display = 'block';
    }

    async editarJefe(idJefe) {
        try {
            const response = await fetch(`/api/admin/jefe/${idJefe}`);
            const data = await response.json();
            
            if (data.success) {
                this.abrirModalJefe(data.jefe);
            }
        } catch (error) {
            console.error('Error cargando jefe:', error);
            alert('Error al cargar datos del jefe');
        }
    }

    async guardarJefe() {
        const formData = {
            id_jefe: document.getElementById('jefeId').value || null,
            nombre_completo: document.getElementById('jefeNombre').value,
            correo_electronico: document.getElementById('jefeCorreo').value,
            area: document.getElementById('jefeArea').value,
            ubicacion: document.getElementById('jefeUbicacion').value
        };
        
        try {
            const response = await fetch('/api/admin/jefe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Jefe guardado correctamente');
                this.cerrarModalJefe();
                this.cargarGestionJefes();
                this.cargarJefes(); // Recargar lista para selects
                this.cargarResumenGeneral();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error guardando jefe:', error);
            alert('Error de conexión');
        }
    }

    cerrarModalJefe() {
        document.getElementById('modalJefe').style.display = 'none';
    }

    async toggleAlumno(idAlumno, activo) {
        if (!confirm(`¿Estás seguro de que quieres ${activo ? 'activar' : 'desactivar'} este alumno?`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/admin/toggle-alumno', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_alumno: idAlumno, activo: activo })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Alumno ${activo ? 'activado' : 'desactivado'} correctamente`);
                this.cargarGestionAlumnos();
                this.cargarResumenGeneral();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error cambiando estado del alumno:', error);
            alert('Error de conexión');
        }
    }

    async toggleJefe(idJefe, activo) {
        if (!confirm(`¿Estás seguro de que quieres ${activo ? 'activar' : 'desactivar'} este jefe?`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/admin/toggle-jefe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_jefe: idJefe, activo: activo })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert(`Jefe ${activo ? 'activado' : 'desactivado'} correctamente`);
                this.cargarGestionJefes();
                this.cargarJefes(); // Recargar lista para selects
                this.cargarResumenGeneral();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error cambiando estado del jefe:', error);
            alert('Error de conexión');
        }
    }

    filtrarAlumnos() {
        // Implementación básica de filtro - puedes mejorarla
        const filtroTexto = document.getElementById('filtroAlumnos').value.toLowerCase();
        const filtroJefe = document.getElementById('filtroJefe').value;
        
        const filas = document.querySelectorAll('#tbodyGestionAlumnos tr');
        
        filas.forEach(fila => {
            const textoFila = fila.textContent.toLowerCase();
            const jefeFila = fila.cells[4].textContent;
            let mostrar = true;
            
            if (filtroTexto && !textoFila.includes(filtroTexto)) {
                mostrar = false;
            }
            
            if (filtroJefe && jefeFila !== filtroJefe) {
                mostrar = false;
            }
            
            fila.style.display = mostrar ? '' : 'none';
        });
    }

    generarReporte(tipo) {
        alert(`Generando reporte: ${tipo}\n\nEsta funcionalidad puede extenderse para generar PDFs o Excel`);
        // Aquí puedes implementar la generación de reportes específicos
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

    // Agregar estas funciones a la clase AdminDashboard

    generarPassword(tipo) {
        const password = this.generarPasswordAleatoria();
        const fieldId = tipo === 'alumno' ? 'alumnoPassword' : 'jefePassword';
        const field = document.getElementById(fieldId);
        
        field.value = password;
        field.type = 'text';
        field.classList.add('password-generated');
        
        // Mostrar la contraseña por 5 segundos luego ocultarla
        setTimeout(() => {
            field.type = 'password';
            field.classList.remove('password-generated');
        }, 5000);
    }

    generarPasswordAleatoria() {
        const longitud = 8;
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        let password = '';
        
        for (let i = 0; i < longitud; i++) {
            password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        
        return password;
    }

    mostrarPassword(tipo) {
        const fieldId = tipo === 'alumno' ? 'alumnoPassword' : 'jefePassword';
        const field = document.getElementById(fieldId);
        
        if (field.type === 'password') {
            field.type = 'text';
            setTimeout(() => {
                if (field.type === 'text') {
                    field.type = 'password';
                }
            }, 3000);
        } else {
            field.type = 'password';
        }
    }

    // Actualizar la función abrirModalAlumno
    abrirModalAlumno(alumno = null) {
        const modal = document.getElementById('modalAlumno');
        const titulo = document.getElementById('modalAlumnoTitulo');
        const form = document.getElementById('formAlumno');
        
        form.reset();
        
        if (alumno) {
            titulo.textContent = 'Editar Alumno';
            document.getElementById('alumnoId').value = alumno.id_alumno;
            document.getElementById('alumnoNombre').value = alumno.nombre_completo;
            document.getElementById('alumnoCorreo').value = alumno.correo_electronico;
            document.getElementById('alumnoCarrera').value = alumno.carrera;
            document.getElementById('alumnoSemestre').value = alumno.semestre;
            document.getElementById('alumnoPromedio').value = alumno.promedio || '';
            document.getElementById('alumnoTipoBeca').value = alumno.tipo_beca || 'Académica';
            document.getElementById('alumnoPorcentajeBeca').value = alumno.porcentaje_beca || '';
            document.getElementById('alumnoJefe').value = alumno.id_jefe || '';
            document.getElementById('alumnoPassword').value = ''; // No mostrar contraseña existente
            document.getElementById('alumnoPassword').placeholder = 'Dejar vacío para mantener la actual';
            document.getElementById('alumnoPassword').required = false;
        } else {
            titulo.textContent = 'Nuevo Alumno';
            document.getElementById('alumnoId').value = '';
            document.getElementById('alumnoPassword').placeholder = 'Ingresa o genera una contraseña';
            document.getElementById('alumnoPassword').required = true;
            // Generar contraseña automáticamente para nuevos usuarios
            setTimeout(() => this.generarPassword('alumno'), 500);
        }
        
        modal.style.display = 'block';
    }

    // Actualizar la función abrirModalJefe
    abrirModalJefe(jefe = null) {
        const modal = document.getElementById('modalJefe');
        const titulo = document.getElementById('modalJefeTitulo');
        const form = document.getElementById('formJefe');
        
        form.reset();
        
        if (jefe) {
            titulo.textContent = 'Editar Jefe de Servicio';
            document.getElementById('jefeId').value = jefe.id_jefe;
            document.getElementById('jefeNombre').value = jefe.nombre_completo;
            document.getElementById('jefeCorreo').value = jefe.correo_electronico;
            document.getElementById('jefeArea').value = jefe.area;
            document.getElementById('jefeUbicacion').value = jefe.ubicacion || '';
            document.getElementById('jefePassword').value = ''; // No mostrar contraseña existente
            document.getElementById('jefePassword').placeholder = 'Dejar vacío para mantener la actual';
            document.getElementById('jefePassword').required = false;
        } else {
            titulo.textContent = 'Nuevo Jefe de Servicio';
            document.getElementById('jefeId').value = '';
            document.getElementById('jefePassword').placeholder = 'Ingresa o genera una contraseña';
            document.getElementById('jefePassword').required = true;
            // Generar contraseña automáticamente para nuevos usuarios
            setTimeout(() => this.generarPassword('jefe'), 500);
        }
        
        modal.style.display = 'block';
    }

    // Actualizar la función guardarAlumno
    async guardarAlumno() {
        const formData = {
            id_alumno: document.getElementById('alumnoId').value || null,
            nombre_completo: document.getElementById('alumnoNombre').value,
            correo_electronico: document.getElementById('alumnoCorreo').value,
            carrera: document.getElementById('alumnoCarrera').value,
            semestre: document.getElementById('alumnoSemestre').value,
            promedio: document.getElementById('alumnoPromedio').value || null,
            tipo_beca: document.getElementById('alumnoTipoBeca').value,
            porcentaje_beca: document.getElementById('alumnoPorcentajeBeca').value || null,
            id_jefe: document.getElementById('alumnoJefe').value || null,
            password: document.getElementById('alumnoPassword').value
        };
        
        // Validar contraseña para nuevos usuarios
        if (!formData.id_alumno && !formData.password) {
            alert('La contraseña es requerida para nuevos alumnos');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/alumno', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.password_generated) {
                    alert(`Alumno guardado correctamente.\n\nCONTRASEÑA GENERADA: ${data.password_generated}\n\n¡Guarda esta contraseña y compártela con el alumno!`);
                } else {
                    alert('Alumno guardado correctamente');
                }
                this.cerrarModalAlumno();
                this.cargarGestionAlumnos();
                this.cargarResumenGeneral();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error guardando alumno:', error);
            alert('Error de conexión');
        }
    }

    // Actualizar la función guardarJefe
    async guardarJefe() {
        const formData = {
            id_jefe: document.getElementById('jefeId').value || null,
            nombre_completo: document.getElementById('jefeNombre').value,
            correo_electronico: document.getElementById('jefeCorreo').value,
            area: document.getElementById('jefeArea').value,
            ubicacion: document.getElementById('jefeUbicacion').value,
            password: document.getElementById('jefePassword').value
        };
        
        // Validar contraseña para nuevos usuarios
        if (!formData.id_jefe && !formData.password) {
            alert('La contraseña es requerida para nuevos jefes');
            return;
        }
        
        try {
            const response = await fetch('/api/admin/jefe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (data.password_generated) {
                    alert(`Jefe guardado correctamente.\n\nCONTRASEÑA GENERADA: ${data.password_generated}\n\n¡Guarda esta contraseña y compártela con el jefe!`);
                } else {
                    alert('Jefe guardado correctamente');
                }
                this.cerrarModalJefe();
                this.cargarGestionJefes();
                this.cargarJefes(); // Recargar lista para selects
                this.cargarResumenGeneral();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error guardando jefe:', error);
            alert('Error de conexión');
        }
    }
}

// Inicializar dashboard
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});