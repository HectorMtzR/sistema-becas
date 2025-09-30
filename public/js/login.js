document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = {
        correo: document.getElementById('correo').value,
        password: document.getElementById('password').value,
        tipo: document.getElementById('tipo').value
    };
    
    const mensaje = document.getElementById('mensaje');
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            mensaje.textContent = 'Login exitoso! Redirigiendo...';
            mensaje.className = 'mensaje success';
            mensaje.style.display = 'block';
            
            // Redirigir según el tipo de usuario
            setTimeout(() => {
                switch(formData.tipo) {
                    case 'alumno':
                        window.location.href = '/alumno/dashboard';
                        break;
                    case 'jefe':
                        window.location.href = '/jefe/dashboard';
                        break;
                    case 'admin':
                        window.location.href = '/admin/dashboard';
                        break;
                }
            }, 1000);
        } else {
            mensaje.textContent = data.error || 'Error en el login';
            mensaje.className = 'mensaje error';
            mensaje.style.display = 'block';
        }
    } catch (error) {
        mensaje.textContent = 'Error de conexión';
        mensaje.className = 'mensaje error';
        mensaje.style.display = 'block';
    }
});