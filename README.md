# 📋 Sistema de Gestión de Servicio Becario - Universidad Anáhuac

## 🎯 Descripción General
Sistema web completo para el registro, control y administración de horas de servicio becario en la Universidad Anáhuac. Desarrollado con tecnologías modernas y diseño responsive.

---

## 🚀 Características Principales

### 👥 Sistema de Tres Roles
- **👨‍🎓 Alumno**: Registro de asistencia y seguimiento de progreso
- **👨‍💼 Jefe de Servicio**: Confirmación de registros y gestión de equipo
- **👨‍💻 Administrador**: Control completo del sistema

### 🔐 Autenticación y Seguridad
- Login automático por correo institucional
- Contraseñas encriptadas con bcrypt
- Sessions seguras con Express
- Detección automática de tipo de usuario

### ⏰ Sistema de Asistencia
- Check-in/check-out con timestamp
- Cálculo automático de horas trabajadas
- Confirmación por jefes de servicio
- Historial completo de registros

### 📊 Dashboards Especializados
- **Alumno**: Progreso visual, controles de asistencia, historial
- **Jefe**: Resumen de área, confirmación de registros, gestión de alumnos
- **Admin**: Estadísticas globales, CRUD completo, reportes

---

## 🛠️ Tecnologías Implementadas

### Frontend
- **HTML5** con semántica mejorada
- **CSS3** con Grid, Flexbox y variables CSS
- **JavaScript ES6+** vanilla (sin frameworks)
- **Diseño responsive** para todos los dispositivos

### Backend
- **Node.js** con Express.js
- **MySQL** con relaciones complejas
- **bcrypt** para encriptación
- **Express-session** para manejo de sesiones

### Características Técnicas
- Arquitectura MVC implícita
- API RESTful
- Validaciones frontend y backend
- Manejo de errores centralizado
- Código modular y documentado

---

## 🗄️ Estructura de Base de Datos

### Tablas Principales
```sql
alumno (id, nombre, correo, carrera, semestre, porcentaje_beca, horas_hechas, id_jefe)
jefe_servicio (id, nombre, correo, area, ubicacion)
registro_asistencia (id, id_alumno, id_jefe, check_in, check_out, confirmacion)
administrador (id, nombre, correo)
```

### Relaciones Clave
- Alumno ↔ Jefe de Servicio (N:1)
- Alumno ↔ Registro Asistencia (1:N)
- Jefe ↔ Registro Asistencia (1:N)

---

## 🎨 Diseño y UX

### Paleta de Colores Anáhuac
- **Azul Anáhuac**: `#002E5D` (Principal)
- **Rojo Anáhuac**: `#C8102E` (Acciones/Alertas)
- **Oro Anáhuac**: `#B9975B` (Acentos)
- **Gris Anáhuac**: `#7D7D7D` (Texto secundario)

### Características de Interfaz
- Design system consistente
- Modales elegantes con animaciones
- Feedback visual inmediato
- Navegación intuitiva por pestañas
- Estados de loading y errores

---

## ⚙️ Funcionalidades por Rol

### 👨‍🎓 Alumno
- [x] Dashboard personal con progreso
- [x] Sistema de check-in/check-out
- [x] Visualización de historial
- [x] Porcentaje de avance en tiempo real
- [x] Estados de confirmación de registros

### 👨‍💼 Jefe de Servicio
- [x] Vista general del área asignada
- [x] Lista de alumnos a cargo
- [x] Confirmación/rechazo de registros
- [x] Estadísticas de progreso grupal
- [x] Sistema de observaciones

### 👨‍💻 Administrador
- [x] CRUD completo de alumnos y jefes
- [x] Generación automática de contraseñas
- [x] Estadísticas globales del sistema
- [x] Sistema de filtros y búsqueda
- [x] Activación/desactivación de usuarios
- [x] Asignación de jefes a alumnos

---

## 🔄 Flujos de Trabajo

### Registro de Asistencia
1. **Alumno** hace check-in al iniciar servicio
2. Sistema registra timestamp automáticamente
3. **Alumno** hace check-out al terminar
4. Sistema calcula horas trabajadas
5. **Jefe** recibe notificación de registro pendiente
6. **Jefe** confirma o rechaza con observaciones
7. Si se confirma, horas se suman al progreso del alumno

### Gestión de Usuarios
1. **Admin** crea usuario (alumno/jefe)
2. Sistema genera contraseña automáticamente
3. **Admin** comparte credenciales con usuario
4. Usuario puede cambiar contraseña después

---

## 📱 Responsive Design

### Breakpoints Implementados
- **Desktop**: > 768px (Experiencia completa)
- **Tablet**: 768px - 480px (Navegación adaptada)
- **Mobile**: < 480px (Interfaz optimizada)

### Características Mobile
- Menús colapsables
- Tablas scrollables horizontales
- Botones de tamaño táctil
- Forms optimizados para móvil

---

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 14+
- MySQL 5.7+
- Navegador moderno

### Setup Rápido
```bash
# 1. Clonar repositorio
git clone [url-repositorio]

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos
mysql -u root -p < database/setup.sql

# 4. Iniciar servidor
npm start

# 5. Acceder al sistema
# http://localhost:3000
```

### Usuarios de Prueba
- **Alumno**: ana.garcia@estudiante.edu / [contraseña]
- **Jefe**: juan.perez@universidad.edu / [contraseña]  
- **Admin**: admin@universidad.edu / [contraseña]

---

## 🔒 Seguridad Implementada

### Medidas de Protección
- Encriptación bcrypt para contraseñas
- Validación de sesiones en cada ruta
- Sanitización de inputs
- Protección contra SQL injection
- Headers de seguridad HTTP

### Controles de Acceso
- Middleware de autenticación
- Verificación de permisos por rol
- Redirección automática no autorizados
- Logout seguro con destrucción de sesión

---

## 📈 Escalabilidad y Mantenibilidad

### Arquitectura
- Separación clara de responsabilidades
- Código modular y reutilizable
- Documentación inline completa
- Estructura de archivos organizada

### Características para Desarrollo
- Console logs descriptivos
- Manejo centralizado de errores
- Validaciones en frontend y backend
- Fácil extensión de funcionalidades

---

## 🎯 Próximas Mejoras Potenciales

### Prioridad Alta
- [ ] Sistema de recuperación de contraseñas
- [ ] Notificaciones por email
- [ ] Exportación de reportes (PDF/Excel)
- [ ] Gráficos interactivos de analytics

### Prioridad Media
- [ ] PWA (Progressive Web App)
- [ ] Modo oscuro
- [ ] Atajos de teclado
- [ ] Sistema de backup automático

### Prioridad Baja
- [ ] API para aplicaciones móviles
- [ ] Integración con SSO universitario
- [ ] Sistema de mensajería interna
- [ ] Auditoría completa de cambios

---

## 📞 Soporte y Mantenimiento

### Documentación
- Código completamente documentado
- Estructura de archivos comentada
- Variables CSS organizadas
- Comentarios en español claros

### Características para Debug
- Logs descriptivos en consola
- Estados de error específicos
- Validaciones visibles al usuario
- Mensajes de ayuda contextual

---

## 🏆 Estado del Proyecto

### ✅ Completado
- [x] Sistema base funcional
- [x] Tres roles de usuario
- [x] CRUD completo
- [x] Diseño responsive
- [x] Seguridad básica
- [x] Base de datos relacional
- [x] Documentación técnica

### 🟡 En Producción
- Sistema completamente funcional
- Listo para deployment
- Código estabilizado
- Testing manual completo
