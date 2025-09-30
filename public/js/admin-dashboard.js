/**
 * ADMIN DASHBOARD - SISTEMA DE GESTIÓN DE BECAS
 * Controlador principal del dashboard de administración
 * Organizado por funcionalidades y secciones
 */

class AdminDashboard {
    constructor() {
        this.user = null;
        this.jefes = [];
        this.init();
    }

    // ========== INICIALIZACIÓN Y CONFIGURACIÓN ==========

    /**
     * Inicializa el dashboard completo
     */
    async init() {
        await this.verificarSesion();
        await this.cargarJefes();
        this.setupEventListeners();
        this.setupUXMejoras();
        this.mostrarTab('resumen');
        await this.cargarResumenGeneral();
    }

    /**
     * Verifica la sesión del usuario
     */
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

    // ========== CONFIGURACIÓN DE EVENTOS ==========

    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        this.setupEventListenersNavegacion();
        this.setupEventListenersModales();
        this.setupEventListenersFiltros();
        this.setupEventListenersLogout();
    }

    /**
     * Configura event listeners de navegación
     */
    setupEventListenersNavegacion() {
        // Navegación entre pestañas
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.getAttribute('data-tab');
                this.mostrarTab(tab);
            });
        });
    }

    /**
     * Configura event listeners de modales
     */
    setupEventListenersModales() {
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

        // Cerrar modales
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        // Cerrar modales al hacer click fuera
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.cerrarTodosLosModales();
            }
        });
    }

    /**
     * Configura event listeners de filtros
     */
    setupEventListenersFiltros() {
        document.getElementById('filtroAlumnos').addEventListener('input', () => {
            this.filtrarAlumnos();
        });

        document.getElementById('filtroJefe').addEventListener('change', () => {
            this.filtrarAlumnos();
        });
    }

    /**
     * Configura event listeners de logout
     */
    setupEventListenersLogout() {
        document.getElementById('btnLogout').addEventListener('click', () => {
            this.cerrarSesion();
        });
    }

    // ========== MEJORAS DE EXPERIENCIA DE USUARIO ==========

    /**
     * Configura mejoras de UX
     */
    setupUXMejoras() {
        this.setupCerrarModalesConESC();
        this.setupAutoFocusEnModales();
        this.setupConfirmacionesDestructivas();
    }

    /**
     * Permite cerrar modales con la tecla ESC
     */
    setupCerrarModalesConESC() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cerrarTodosLosModales();
            }
        });
    }

    /**
     * Enfoca automáticamente el primer campo al abrir modales
     */
    setupAutoFocusEnModales() {
        // Usar MutationObserver para detectar cuando se abre un modal
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const modal = mutation.target;
                    if (modal.style.display === 'block') {
                        this.enfocarPrimerCampo(modal);
                    }
                }
            });
        });

        // Observar cambios en los modales
        document.querySelectorAll('.modal').forEach(modal => {
            observer.observe(modal, { attributes: true });
        });
    }

    /**
     * Enfoca el primer campo input del modal
     */
    enfocarPrimerCampo(modal) {
        const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 300);
        }
    }

    /**
     * Configura confirmaciones para acciones destructivas
     */
    setupConfirmacionesDestructivas() {
        // Se implementa en los métodos específicos (toggleAlumno, toggleJefe)
    }

    // ========== SISTEMA DE PESTAÑAS (TABS) ==========

    /**
     * Muestra una pestaña específica
     */
    mostrarTab(tabName) {
        this.ocultarTodasLasPestanas();
        this.activarBotonPestana(tabName);
        this.mostrarContenidoPestana(tabName);
        this.cargarDatosPestana(tabName);
    }

    /**
     * Oculta todas las pestañas
     */
    ocultarTodasLasPestanas() {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    /**
     * Activa el botón de la pestaña seleccionada
     */
    activarBotonPestana(tabName) {
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }

    /**
     * Muestra el contenido de la pestaña seleccionada
     */
    mostrarContenidoPestana(tabName) {
        document.getElementById(tabName).classList.add('active');
    }

    /**
     * Carga datos específicos de la pestaña
     */
    cargarDatosPestana(tabName) {
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

    // ========== GESTIÓN DE DATOS - RESUMEN GENERAL ==========

    /**
     * Carga el resumen general del sistema
     */
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
            this.mostrarError('No se pudo cargar el resumen del sistema');
        }
    }

    /**
     * Actualiza las estadísticas del resumen
     */
    actualizarResumen(resumen) {
        document.getElementById('totalAlumnosSistema').textContent = resumen.totalAlumnos || 0;
        document.getElementById('totalJefesSistema').textContent = resumen.totalJefes || 0;
        document.getElementById('totalHorasSistema').textContent = resumen.totalHoras || 0;
        document.getElementById('totalPendientesSistema').textContent = resumen.totalPendientes || 0;
    }

    /**
     * Muestra los últimos registros de asistencia
     */
    mostrarUltimosRegistros(registros) {
        const tbody = document.getElementById('tbodyUltimosRegistros');
        tbody.innerHTML = '';

        if (registros.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay registros recientes</td></tr>';
            return;
        }

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

    // ========== GESTIÓN DE ALUMNOS ==========

    /**
     * Carga la lista de alumnos para gestión
     */
    async cargarGestionAlumnos() {
        try {
            this.mostrarLoading('Cargando lista de alumnos...');
            const response = await fetch('/api/admin/alumnos');
            const data = await response.json();
            
            if (data.success) {
                this.mostrarAlumnosGestion(data.alumnos);
            }
        } catch (error) {
            console.error('Error cargando alumnos para gestión:', error);
            this.mostrarError('Error al cargar la lista de alumnos');
        } finally {
            this.ocultarLoading();
        }
    }

    /**
     * Muestra la lista de alumnos en la tabla
     */
    mostrarAlumnosGestion(alumnos) {
        const tbody = document.getElementById('tbodyGestionAlumnos');
        tbody.innerHTML = '';

        if (alumnos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No hay alumnos registrados</td></tr>';
            return;
        }

        alumnos.forEach(alumno => {
            const row = document.createElement('tr');
            
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

    // ========== GESTIÓN DE JEFES ==========

    /**
     * Carga la lista de jefes
     */
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

    /**
     * Actualiza los selects de jefes en los formularios
     */
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

    /**
     * Carga la gestión de jefes
     */
    async cargarGestionJefes() {
        try {
            this.mostrarLoading('Cargando lista de jefes...');
            const response = await fetch('/api/admin/jefes');
            const data = await response.json();
            
            if (data.success) {
                this.mostrarJefesGestion(data.jefes);
            }
        } catch (error) {
            console.error('Error cargando jefes para gestión:', error);
            this.mostrarError('Error al cargar la lista de jefes');
        } finally {
            this.ocultarLoading();
        }
    }

    /**
     * Muestra la lista de jefes en la tabla
     */
    mostrarJefesGestion(jefes) {
        const tbody = document.getElementById('tbodyGestionJefes');
        tbody.innerHTML = '';

        if (jefes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay jefes registrados</td></tr>';
            return;
        }

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

    // ========== SISTEMA DE MODALES - ALUMNOS ==========

    /**
     * Abre el modal para crear/editar alumno
     */
    abrirModalAlumno(alumno = null) {
        const modal = document.getElementById('modalAlumno');
        const titulo = document.getElementById('modalAlumnoTitulo');
        const form = document.getElementById('formAlumno');
        
        form.reset();
        
        if (alumno) {
            titulo.textContent = 'Editar Alumno';
            this.configurarModalAlumnoEdicion(alumno);
        } else {
            titulo.textContent = 'Nuevo Alumno';
            this.configurarModalAlumnoNuevo();
        }
        
        modal.style.display = 'block';
    }

    /**
     * Configura el modal para edición de alumno
     */
    configurarModalAlumnoEdicion(alumno) {
        document.getElementById('alumnoId').value = alumno.id_alumno;
        document.getElementById('alumnoNombre').value = alumno.nombre_completo;
        document.getElementById('alumnoCorreo').value = alumno.correo_electronico;
        document.getElementById('alumnoCarrera').value = alumno.carrera;
        document.getElementById('alumnoSemestre').value = alumno.semestre;
        document.getElementById('alumnoPromedio').value = alumno.promedio || '';
        document.getElementById('alumnoTipoBeca').value = alumno.tipo_beca || 'Académica';
        document.getElementById('alumnoPorcentajeBeca').value = alumno.porcentaje_beca || '';
        document.getElementById('alumnoJefe').value = alumno.id_jefe || '';
        document.getElementById('alumnoPassword').value = '';
        document.getElementById('alumnoPassword').placeholder = 'Dejar vacío para mantener la actual';
        document.getElementById('alumnoPassword').required = false;
    }

    /**
     * Configura el modal para nuevo alumno
     */
    configurarModalAlumnoNuevo() {
        document.getElementById('alumnoId').value = '';
        document.getElementById('alumnoPassword').placeholder = 'Ingresa o genera una contraseña';
        document.getElementById('alumnoPassword').required = true;
        // Generar contraseña automáticamente para nuevos usuarios
        setTimeout(() => this.generarPassword('alumno'), 500);
    }

    /**
     * Carga los datos de un alumno para edición
     */
    async editarAlumno(idAlumno) {
        try {
            this.mostrarLoading('Cargando datos del alumno...');
            const response = await fetch(`/api/admin/alumno/${idAlumno}`);
            const data = await response.json();
            
            if (data.success) {
                this.abrirModalAlumno(data.alumno);
            } else {
                this.mostrarError('No se pudieron cargar los datos del alumno');
            }
        } catch (error) {
            console.error('Error cargando alumno:', error);
            this.mostrarError('Error al cargar datos del alumno');
        } finally {
            this.ocultarLoading();
        }
    }

    /**
     * Guarda los datos del alumno (crear o actualizar)
     */
    async guardarAlumno() {
        const formData = this.obtenerDatosFormularioAlumno();
        
        if (!this.validarFormularioAlumno(formData)) {
            return;
        }
        
        try {
            this.mostrarLoading('Guardando alumno...');
            const response = await fetch('/api/admin/alumno', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.mostrarExitoAlumno(data);
                this.cerrarModalAlumno();
                this.cargarGestionAlumnos();
                this.cargarResumenGeneral();
            } else {
                this.mostrarError('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error guardando alumno:', error);
            this.mostrarError('Error de conexión al guardar alumno');
        } finally {
            this.ocultarLoading();
        }
    }

    /**
     * Obtiene los datos del formulario de alumno
     */
    obtenerDatosFormularioAlumno() {
        return {
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
    }

    /**
     * Valida el formulario de alumno
     */
    validarFormularioAlumno(formData) {
        if (!formData.id_alumno && !formData.password) {
            this.mostrarError('La contraseña es requerida para nuevos alumnos');
            return false;
        }
        
        if (!formData.nombre_completo || !formData.correo_electronico || 
            !formData.carrera || !formData.semestre || !formData.porcentaje_beca) {
            this.mostrarError('Todos los campos obligatorios deben ser llenados');
            return false;
        }
        
        return true;
    }

    /**
     * Muestra mensaje de éxito al guardar alumno
     */
    mostrarExitoAlumno(data) {
        if (data.password_generated) {
            alert(`Alumno guardado correctamente.\n\nCONTRASEÑA GENERADA: ${data.password_generated}\n\n¡Guarda esta contraseña y compártela con el alumno!`);
        } else {
            this.mostrarMensaje('Alumno guardado correctamente', 'success');
        }
    }

    /**
     * Cierra el modal de alumno
     */
    cerrarModalAlumno() {
        document.getElementById('modalAlumno').style.display = 'none';
    }

    // ========== SISTEMA DE MODALES - JEFES ==========

    /**
     * Abre el modal para crear/editar jefe
     */
    abrirModalJefe(jefe = null) {
        const modal = document.getElementById('modalJefe');
        const titulo = document.getElementById('modalJefeTitulo');
        const form = document.getElementById('formJefe');
        
        form.reset();
        
        if (jefe) {
            titulo.textContent = 'Editar Jefe de Servicio';
            this.configurarModalJefeEdicion(jefe);
        } else {
            titulo.textContent = 'Nuevo Jefe de Servicio';
            this.configurarModalJefeNuevo();
        }
        
        modal.style.display = 'block';
    }

    /**
     * Configura el modal para edición de jefe
     */
    configurarModalJefeEdicion(jefe) {
        document.getElementById('jefeId').value = jefe.id_jefe;
        document.getElementById('jefeNombre').value = jefe.nombre_completo;
        document.getElementById('jefeCorreo').value = jefe.correo_electronico;
        document.getElementById('jefeArea').value = jefe.area;
        document.getElementById('jefeUbicacion').value = jefe.ubicacion || '';
        document.getElementById('jefePassword').value = '';
        document.getElementById('jefePassword').placeholder = 'Dejar vacío para mantener la actual';
        document.getElementById('jefePassword').required = false;
    }

    /**
     * Configura el modal para nuevo jefe
     */
    configurarModalJefeNuevo() {
        document.getElementById('jefeId').value = '';
        document.getElementById('jefePassword').placeholder = 'Ingresa o genera una contraseña';
        document.getElementById('jefePassword').required = true;
        // Generar contraseña automáticamente para nuevos usuarios
        setTimeout(() => this.generarPassword('jefe'), 500);
    }

    /**
     * Carga los datos de un jefe para edición
     */
    async editarJefe(idJefe) {
        try {
            this.mostrarLoading('Cargando datos del jefe...');
            const response = await fetch(`/api/admin/jefe/${idJefe}`);
            const data = await response.json();
            
            if (data.success) {
                this.abrirModalJefe(data.jefe);
            } else {
                this.mostrarError('No se pudieron cargar los datos del jefe');
            }
        } catch (error) {
            console.error('Error cargando jefe:', error);
            this.mostrarError('Error al cargar datos del jefe');
        } finally {
            this.ocultarLoading();
        }
    }

    /**
     * Guarda los datos del jefe (crear o actualizar)
     */
    async guardarJefe() {
        const formData = this.obtenerDatosFormularioJefe();
        
        if (!this.validarFormularioJefe(formData)) {
            return;
        }
        
        try {
            this.mostrarLoading('Guardando jefe...');
            const response = await fetch('/api/admin/jefe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.mostrarExitoJefe(data);
                this.cerrarModalJefe();
                this.cargarGestionJefes();
                this.cargarJefes();
                this.cargarResumenGeneral();
            } else {
                this.mostrarError('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error guardando jefe:', error);
            this.mostrarError('Error de conexión al guardar jefe');
        } finally {
            this.ocultarLoading();
        }
    }

    /**
     * Obtiene los datos del formulario de jefe
     */
    obtenerDatosFormularioJefe() {
        return {
            id_jefe: document.getElementById('jefeId').value || null,
            nombre_completo: document.getElementById('jefeNombre').value,
            correo_electronico: document.getElementById('jefeCorreo').value,
            area: document.getElementById('jefeArea').value,
            ubicacion: document.getElementById('jefeUbicacion').value,
            password: document.getElementById('jefePassword').value
        };
    }

    /**
     * Valida el formulario de jefe
     */
    validarFormularioJefe(formData) {
        if (!formData.id_jefe && !formData.password) {
            this.mostrarError('La contraseña es requerida para nuevos jefes');
            return false;
        }
        
        if (!formData.nombre_completo || !formData.correo_electronico || !formData.area) {
            this.mostrarError('Todos los campos obligatorios deben ser llenados');
            return false;
        }
        
        return true;
    }

    /**
     * Muestra mensaje de éxito al guardar jefe
     */
    mostrarExitoJefe(data) {
        if (data.password_generated) {
            alert(`Jefe guardado correctamente.\n\nCONTRASEÑA GENERADA: ${data.password_generated}\n\n¡Guarda esta contraseña y compártela con el jefe!`);
        } else {
            this.mostrarMensaje('Jefe guardado correctamente', 'success');
        }
    }

    /**
     * Cierra el modal de jefe
     */
    cerrarModalJefe() {
        document.getElementById('modalJefe').style.display = 'none';
    }

    // ========== SISTEMA DE CONTRASEÑAS ==========

    /**
     * Genera una contraseña aleatoria
     */
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

    /**
     * Genera una contraseña aleatoria segura
     */
    generarPasswordAleatoria() {
        const longitud = 8;
        const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
        let password = '';
        
        for (let i = 0; i < longitud; i++) {
            password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
        }
        
        return password;
    }

    /**
     * Muestra/oculta la contraseña temporalmente
     */
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

    // ========== GESTIÓN DE ESTADOS (ACTIVAR/DESACTIVAR) ==========

    /**
     * Activa/desactiva un alumno
     */
    async toggleAlumno(idAlumno, activo) {
        const accion = activo ? 'activar' : 'desactivar';
        
        if (!confirm(`¿Estás seguro de que quieres ${accion} este alumno?`)) {
            return;
        }
        
        try {
            this.mostrarLoading(`${activo ? 'Activando' : 'Desactivando'} alumno...`);
            const response = await fetch('/api/admin/toggle-alumno', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_alumno: idAlumno, activo: activo })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.mostrarMensaje(`Alumno ${accion}do correctamente`, 'success');
                this.cargarGestionAlumnos();
                this.cargarResumenGeneral();
            } else {
                this.mostrarError('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error cambiando estado del alumno:', error);
            this.mostrarError('Error de conexión');
        } finally {
            this.ocultarLoading();
        }
    }

    /**
     * Activa/desactiva un jefe
     */
    async toggleJefe(idJefe, activo) {
        const accion = activo ? 'activar' : 'desactivar';
        
        if (!confirm(`¿Estás seguro de que quieres ${accion} este jefe?`)) {
            return;
        }
        
        try {
            this.mostrarLoading(`${activo ? 'Activando' : 'Desactivando'} jefe...`);
            const response = await fetch('/api/admin/toggle-jefe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ id_jefe: idJefe, activo: activo })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.mostrarMensaje(`Jefe ${accion}do correctamente`, 'success');
                this.cargarGestionJefes();
                this.cargarJefes();
                this.cargarResumenGeneral();
            } else {
                this.mostrarError('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error cambiando estado del jefe:', error);
            this.mostrarError('Error de conexión');
        } finally {
            this.ocultarLoading();
        }
    }

    // ========== SISTEMA DE FILTROS ==========

    /**
     * Filtra la lista de alumnos
     */
    filtrarAlumnos() {
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

    // ========== SISTEMA DE REPORTES ==========

    /**
     * Genera reportes del sistema
     */
    generarReporte(tipo) {
        alert(`Generando reporte: ${tipo}\n\nEsta funcionalidad puede extenderse para generar PDFs o Excel`);
        // Aquí puedes implementar la generación de reportes específicos
    }

    // ========== UTILIDADES Y MÉTODOS AUXILIARES ==========

    /**
     * Cierra todos los modales abiertos
     */
    cerrarTodosLosModales() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    /**
     * Muestra un mensaje de carga
     */
    mostrarLoading(mensaje = 'Cargando...') {
        // Implementar sistema de loading si es necesario
        console.log('Loading:', mensaje);
    }

    /**
     * Oculta el mensaje de carga
     */
    ocultarLoading() {
        // Implementar sistema de loading si es necesario
    }

    /**
     * Muestra un mensaje al usuario
     */
    mostrarMensaje(mensaje, tipo = 'info') {
        // Puedes implementar un sistema de notificaciones más elaborado
        alert(mensaje);
    }

    /**
     * Muestra un mensaje de error
     */
    mostrarError(mensaje) {
        this.mostrarMensaje(mensaje, 'error');
    }

    /**
     * Cierra la sesión del usuario
     */
    async cerrarSesion() {
        if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            return;
        }
        
        try {
            await fetch('/api/logout', { method: 'POST' });
            window.location.href = '/';
        } catch (error) {
            console.error('Error cerrando sesión:', error);
            window.location.href = '/';
        }
    }
}

// ========== INICIALIZACIÓN GLOBAL ==========

/**
 * Inicializa el dashboard cuando el DOM está listo
 */
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});