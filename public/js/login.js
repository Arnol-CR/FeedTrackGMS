const form = document.getElementById('form-login');
const btnLogin = document.getElementById('btn-login');
const mensajeError = document.getElementById('mensaje-error');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  ocultarError();

  const usuario = document.getElementById('usuario').value.trim();
  const contrasena = document.getElementById('contrasena').value;

  btnLogin.disabled = true;
  btnLogin.textContent = 'Ingresando...';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contrasena })
    });

    const data = await res.json();

    if (!res.ok) {
      mostrarError(data.detalle ? `${data.error}: ${data.detalle}` : (data.error || 'No se pudo iniciar sesión'));
      return;
    }

    // Guarda el token y datos básicos del usuario
    localStorage.setItem('token', data.token);
    localStorage.setItem('idUsuario', data.idUsuario);
    localStorage.setItem('usuario', data.usuario);

    // Redirige a la pantalla principal
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Error de red al iniciar sesión:', err);
    mostrarError('Error de conexión con el servidor');
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Ingresar';
  }
});

function mostrarError(texto) {
  mensajeError.textContent = texto;
  mensajeError.hidden = false;
}

function ocultarError() {
  mensajeError.hidden = true;
  mensajeError.textContent = '';
}

// Si ya hay un token guardado, intenta ir directo a la app
(function redirigirSiYaHaySesion() {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'index.html';
  }
})();
