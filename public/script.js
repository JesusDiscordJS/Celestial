// script.js

// Lógica para ser executada APENAS na página da dashboard
if (document.body.contains(document.getElementById('userAvatar'))) { // Verifica se elementos da dashboard existem
  document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/me') // Rota no backend para pegar dados do usuário logado
      .then(res => {
        if (!res.ok) {
          // Se não autorizado (ex: sessão expirou ou não logado), redireciona para a página de login
          if (res.status === 401) {
            window.location.href = '/'; // Redireciona para a raiz (página de login)
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
              ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
              : `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.id.slice(-1)) % 5)}.png`; // Avatar padrão baseado no último dígito do ID ou discriminator
            avatarEl.src = avatarUrl;
            avatarEl.style.display = 'block'; // Mostra o avatar
          }
        } else {
           // Caso estranho, dados do usuário não vieram como esperado
           console.warn("Dados do usuário não recebidos como esperado da API /api/me");
           window.location.href = '/'; // Redireciona para login
        }
      })
      .catch(err => {
        console.error("Erro ao verificar autenticação ou buscar dados do usuário:", err);
        window.location.href = '/'; // Em caso de qualquer erro, volta para o login
      });
  });
}

// SEU CÓDIGO EXISTENTE DO SCRIPT.JS (fetchedUserData, showMessage, buscarDadosUsuario, etc.) COMEÇA DAQUI PARA BAIXO
// let fetchedUserData = null;
// function showMessage(message, type = 'error') { ... }
// ... e assim por diante