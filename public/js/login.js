class LoginSystem {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Enter key support
        document.getElementById('password').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleLogin();
            }
        });
    }

    async handleLogin() {
        const correo = document.getElementById('correo').value.trim();
        const password = document.getElementById('password').value;
        const mensaje = document.getElementById('mensaje');
        const btnLogin = document.querySelector('.btn-login');

        // Validaciones básicas
        if (!correo || !password) {
            this.showMessage('Por favor, completa todos los campos', 'error');
            return;
        }

        if (!this.isValidEmail(correo)) {
            this.showMessage('Por favor, ingresa un correo electrónico válido', 'error');
            return;
        }

        // Mostrar loading
        this.setLoadingState(true, btnLogin);

        try {
            const response = await fetch('/api/login-auto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ correo, password })
            });

            const data = await response.json();

            if (data.success) {
                this.showMessage('¡Login exitoso! Redirigiendo...', 'success');
                
                // Redirigir según el tipo de usuario detectado automáticamente
                setTimeout(() => {
                    switch(data.user.tipo) {
                        case 'alumno':
                            window.location.href = '/alumno/dashboard';
                            break;
                        case 'jefe':
                            window.location.href = '/jefe/dashboard';
                            break;
                        case 'admin':
                            window.location.href = '/admin/dashboard';
                            break;
                        default:
                            this.showMessage('Tipo de usuario no reconocido', 'error');
                    }
                }, 1000);
            } else {
                this.showMessage(data.error || 'Error en el login', 'error');
            }
        } catch (error) {
            console.error('Error de conexión:', error);
            this.showMessage('Error de conexión. Verifica tu internet.', 'error');
        } finally {
            this.setLoadingState(false, btnLogin);
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    setLoadingState(loading, button) {
        if (loading) {
            button.disabled = true;
            button.classList.add('btn-loading');
            button.textContent = 'Iniciando sesión...';
        } else {
            button.disabled = false;
            button.classList.remove('btn-loading');
            button.textContent = 'Iniciar Sesión';
        }
    }

    showMessage(text, type) {
        const mensaje = document.getElementById('mensaje');
        mensaje.textContent = text;
        mensaje.className = `mensaje ${type}`;
        mensaje.style.display = 'block';

        // Auto-ocultar mensajes de éxito
        if (type === 'success') {
            setTimeout(() => {
                mensaje.style.display = 'none';
            }, 3000);
        }
    }
}

// Inicializar el sistema de login cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    new LoginSystem();
});