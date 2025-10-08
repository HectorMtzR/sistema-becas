-- Setup para producción - Sistema de Becas Anáhuac
CREATE DATABASE IF NOT EXISTS sistema_becas_prod;
USE sistema_becas_prod;

-- Tabla jefe_servicio
CREATE TABLE IF NOT EXISTS jefe_servicio (
    id_jefe INT PRIMARY KEY AUTO_INCREMENT,
    nombre_completo VARCHAR(100) NOT NULL,
    correo_electronico VARCHAR(100) UNIQUE NOT NULL,
    area VARCHAR(50) NOT NULL,
    ubicacion VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla alumno
CREATE TABLE IF NOT EXISTS alumno (
    id_alumno INT PRIMARY KEY AUTO_INCREMENT,
    nombre_completo VARCHAR(100) NOT NULL,
    correo_electronico VARCHAR(100) UNIQUE NOT NULL,
    carrera VARCHAR(50) NOT NULL,
    semestre INT,
    promedio DECIMAL(3,1),
    tipo_beca VARCHAR(30),
    porcentaje_beca INT,
    horas_hechas INT DEFAULT 0,
    id_jefe INT,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_jefe) REFERENCES jefe_servicio(id_jefe)
);

-- Tabla administrador
CREATE TABLE IF NOT EXISTS administrador (
    id_admin INT PRIMARY KEY AUTO_INCREMENT,
    nombre_completo VARCHAR(100) NOT NULL,
    correo_electronico VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla registro_asistencia
CREATE TABLE IF NOT EXISTS registro_asistencia (
    id_registro INT PRIMARY KEY AUTO_INCREMENT,
    id_alumno INT NOT NULL,
    id_jefe INT NOT NULL,
    fecha DATE NOT NULL,
    check_in TIMESTAMP NOT NULL,
    check_out TIMESTAMP NULL,
    horas_trabajadas DECIMAL(4,2),
    confirmacion BOOLEAN DEFAULT FALSE,
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_alumno) REFERENCES alumno(id_alumno),
    FOREIGN KEY (id_jefe) REFERENCES jefe_servicio(id_jefe)
);

-- Insertar datos iniciales de prueba
INSERT IGNORE INTO jefe_servicio (nombre_completo, correo_electronico, area, ubicacion, password_hash) VALUES
('Juan Pérez García', 'juan.perez@anahuac.edu', 'Biblioteca', 'Edificio Central', '$2a$10$rOzZzZQzZQzZQzZQzZQzZu'),
('María López Hernández', 'maria.lopez@anahuac.edu', 'Laboratorio', 'Edificio Científico', '$2a$10$rOzZzZQzZQzZQzZQzZQzZu');

INSERT IGNORE INTO alumno (nombre_completo, correo_electronico, carrera, semestre, promedio, tipo_beca, porcentaje_beca, id_jefe, password_hash) VALUES
('Ana García Martínez', 'ana.garcia@alumno.anahuac.edu', 'Ingeniería en Sistemas', 6, 85.5, 'Académica', 50, 1, '$2a$10$rOzZzZQzZQzZQzZQzZQzZu'),
('Carlos Rodríguez Silva', 'carlos.rodriguez@alumno.anahuac.edu', 'Administración', 4, 90.0, 'Deportiva', 30, 2, '$2a$10$rOzZzZQzZQzZQzZQzZQzZu');

INSERT IGNORE INTO administrador (nombre_completo, correo_electronico, password_hash) VALUES
('Administrador Principal', 'admin@anahuac.edu', '$2a$10$rOzZzZQzZQzZQzZQzZQzZu');

-- Actualizar passwords con bcrypt (ejecutar después del deploy)
-- UPDATE alumno SET password_hash = '$2a$10$rOzZzZQzZQzZQzZQzZQzZu' WHERE password_hash = '123456';
-- UPDATE jefe_servicio SET password_hash = '$2a$10$rOzZzZQzZQzZQzZQzZQzZu' WHERE password_hash = '123456';
-- UPDATE administrador SET password_hash = '$2a$10$rOzZzZQzZQzZQzZQzZQzZu' WHERE password_hash = '123456';