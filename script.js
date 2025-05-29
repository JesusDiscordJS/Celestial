// script.js (NO REPOSITÓRIO DO FRONTEND/GITHUB PAGES)

const API_BASE_URL = "https://SUA_API_NO_RENDER.onrender.com"; // <<< SUBSTITUA PELA URL REAL DA SUA API

// Lógica para ser executada APENAS na página da dashboard
if (document.body.contains(document.getElementById('userAvatar'))) {
  document.addEventListener('DOMContentLoaded', () => {
    fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = 'index.html'; // Vai para a página de login do frontend
          }
          return Promise.reject(new Error(`Falha ao buscar usuário: ${res.status}`));
        }
        return res.json();
      })
      .then(user => {
        if (user && user.id) {
          const welcomeEl = document.getElementById('welcomeMessage');
          const avatarEl = document.getElementById('userAvatar');
          if (welcomeEl) welcomeEl.textContent = `Bem-vindo(a), ${user.username}!`;
          if (avatarEl) {
            const avatarUrl = user.avatar
              ? `https://cdn.discordapp.com/avatars/<span class="math-inline">\{user\.id\}/</span>{user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
              : `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.id.slice(-1)) % 5)}.png`;
            avatarEl.src = avatarUrl;
            avatarEl.style.display = 'block';
          }
        } else {
          window.location.href = 'index.html';
        }
      })
      .catch(err => {
        console.error("Erro ao verificar autenticação:", err);
        window.location.href = 'index.html';
      });

    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
          const response = await fetch(`${API_BASE_URL}/auth/logout`, { credentials: 'include' });
          const data = await response.json(); // API envia JSON com redirectTo
          if (response.ok && data.redirectTo) {
            window.location.href = data.redirectTo; // Redireciona para a pág de login do frontend
          } else {
            console.error("Falha no logout:", data.error || "Resposta inesperada");
            window.location.href = 'index.html'; // Fallback
          }
        } catch (error) {
          console.error("Erro de rede no logout:", error);
          window.location.href = 'index.html'; // Fallback
        }
      });
    }
  });
}

// --- SEU CÓDIGO EXISTENTE DO SCRIPT.JS (tracker) COMEÇA ABAIXO ---
// let fetchedUserData = null;
// function showMessage(message, type = 'error') { ... }
// ... (coloque aqui o resto do seu script.js que você me enviou) ...