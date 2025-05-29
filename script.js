// script.js (PARA O REPOSITÓRIO DO FRONTEND NO GITHUB PAGES)

const API_BASE_URL = "https://celestial-api.onrender.com/api/avatars/"; // <<< SUBSTITUA PELA URL REAL DA SUA API NO RENDER!

// Lógica para ser executada APENAS na página da dashboard
// Verifica se elementos específicos da dashboard existem para evitar rodar na página de login
if (document.body.contains(document.getElementById('userAvatar')) && document.body.contains(document.getElementById('welcomeMessage'))) {
  document.addEventListener('DOMContentLoaded', () => {
    fetch(`${API_BASE_URL}/api/me`, { credentials: 'include' }) // Adiciona credentials: 'include'
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            // Se não autorizado, redireciona para a PÁGINA DE LOGIN DO FRONTEND (index.html)
            window.location.href = 'index.html'; // Ajuste se sua página de login tiver outro nome ou caminho relativo
          }
          return Promise.reject(new Error(`Falha ao buscar dados do usuário: ${res.status}`));
        }
        return res.json();
      })
      .then(user => {
        if (user && user.id) {
          const welcomeEl = document.getElementById('welcomeMessage');
          const avatarEl = document.getElementById('userAvatar');
          
          if (welcomeEl) welcomeEl.textContent = `Bem-vindo(a), ${user.username}!`;
          
          if (avatarEl) {
            const avatarHash = user.avatar;
            const userId = user.id;
            // O discriminator pode não existir mais para todos os usuários (novos usernames sem #)
            // Usar o ID para o avatar padrão é mais robusto
            const defaultAvatarIndex = (BigInt(userId) % 5n).toString(); // Para IDs grandes, usar BigInt

            const avatarUrl = avatarHash
              ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${avatarHash.startsWith("a_") ? "gif" : "png"}?size=128`
              : `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
            avatarEl.src = avatarUrl;
            avatarEl.style.display = 'block';
          }
        } else {
           // Caso os dados do usuário não venham como esperado
           console.warn("Dados do usuário não recebidos como esperado da API /api/me");
           window.location.href = 'index.html'; // Redireciona para login
        }
      })
      .catch(err => {
        console.error("Erro ao verificar autenticação ou buscar dados do usuário:", err);
        window.location.href = 'index.html'; // Em caso de qualquer erro, volta para o login
      });

    // Lógica do botão de logout
    const logoutButton = document.querySelector('.logout-button'); // Certifique-se que seu botão tem essa classe
    if (logoutButton) {
      // Remove o href para que o JS controle totalmente, ou deixe mas use preventDefault
      logoutButton.href = "#"; 
      logoutButton.addEventListener('click', async (event) => {
        event.preventDefault(); 
        try {
          const response = await fetch(`${API_BASE_URL}/auth/logout`, { credentials: 'include' });
          const data = await response.json(); // A API envia JSON com redirectTo
          if (response.ok && data.redirectTo) {
            // Redireciona para a página de login DO FRONTEND após logout bem-sucedido
            window.location.href = data.redirectTo.startsWith('http') ? data.redirectTo : 'index.html'; // Garante que é URL de login do frontend
          } else {
            console.error("Falha no logout:", data.error || "Resposta inesperada da API.");
            alert("Erro ao fazer logout. Redirecionando para a página inicial.");
            window.location.href = 'index.html'; // Fallback para a pág de login do frontend
          }
        } catch (error) {
          console.error("Erro de rede no logout:", error);
          alert("Erro de rede ao tentar fazer logout. Redirecionando para a página inicial.");
          window.location.href = 'index.html'; // Fallback para a pág de login do frontend
        }
      });
    }
  });
}

// --- SEU CÓDIGO ORIGINAL DO TRACKER COMEÇA ABAIXO ---
let fetchedUserData = null;

function showMessage(message, type = 'error') {
  const messageContainer = document.getElementById('messageContainer');
  if (!messageContainer) {
    // console.warn("Elemento 'messageContainer' não encontrado. A mensagem não será exibida.");
    return; 
  }
  const messageElement = document.createElement('div');
  messageElement.className = type === 'error' ? '' : 'success-message';
  messageElement.id = type === 'error' ? 'errorMessage' : 'successMessage';
  messageElement.textContent = message;
  messageElement.style.display = 'block';

  messageContainer.innerHTML = '';
  messageContainer.appendChild(messageElement);

  setTimeout(() => {
    messageElement.style.opacity = '0';
    setTimeout(() => messageElement.remove(), 300);
  }, 6000);
}

function updateStats(avatarCount = 0, usernameCount = 0) {
  const elements = {
    totalAvatars: document.getElementById('totalAvatars'),
    totalUsernames: document.getElementById('totalUsernames'),
    dataQuality: document.getElementById('dataQuality'),
    lastUpdate: document.getElementById('lastUpdate'),
    avatarCount: document.getElementById('avatarCount'),
    usernameCount: document.getElementById('usernameCount')
  };

  if (elements.totalAvatars && elements.totalUsernames && elements.dataQuality && elements.lastUpdate && elements.avatarCount && elements.usernameCount) {
    const quality = Math.min(100, Math.round(((avatarCount + usernameCount) / 20) * 100));
    elements.totalAvatars.textContent = avatarCount;
    elements.totalUsernames.textContent = usernameCount;
    elements.dataQuality.textContent = quality + '%';
    elements.lastUpdate.textContent = new Date().toLocaleDateString('pt-BR');
    elements.avatarCount.textContent = `${avatarCount} avatares`;
    elements.usernameCount.textContent = `${usernameCount} registros`;
  } else {
    // console.warn("Um ou mais elementos de estatísticas não foram encontrados no DOM.");
  }
}

function initializeUserInfoFields() {
  const fieldsToReset = {
    'userInfoId': '<span class="placeholder">🔄 Carregando...</span>',
    'currentUser': '<span class="placeholder">🔄 Carregando...</span>',
    'userStatus': '<span class="placeholder">🔄 Verificando...</span>',
    'lastJoinCallInfo': '<span class="placeholder">🔄 Carregando...</span>',
    'lastLeaveCallInfo': '<span class="placeholder">🔄 Carregando...</span>',
    'currentAvatarMsg': '<span class="placeholder">🔄 Carregando avatar...</span>',
    'oldUsernamesList': '<li class="placeholder">🔄 Carregando histórico de nomes...</li>',
    'oldAvatarsContainer': '<p id="oldAvatarsMsg" class="placeholder">🔄 Carregando galeria de avatares...</p>'
  };

  let criticalElementMissing = false;
  for (const id in fieldsToReset) {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = fieldsToReset[id];
      if (id === 'currentAvatarMsg') element.className = 'placeholder';
    } else {
      // Se for um elemento crucial para o tracker e não para o header da dashboard, pode ser um problema.
      if (!['userAvatar', 'welcomeMessage'].includes(id)) { 
         // console.warn(`Elemento '${id}' para inicialização não encontrado.`);
         criticalElementMissing = true;
      }
    }
  }
   // Se estamos claramente na página de dashboard (tem userAvatar) mas faltam campos do tracker, não prossiga com certas inicializações
  if (document.body.contains(document.getElementById('userAvatar')) && criticalElementMissing && !document.getElementById('userInfoId')) {
      return;
  }


  const currentAvatarImg = document.getElementById('currentAvatarImg');
  if (currentAvatarImg) {
    currentAvatarImg.style.display = 'none';
    currentAvatarImg.src = '#';
  }
  
  const currentAvatarMsgEl = document.getElementById('currentAvatarMsg');
  if (currentAvatarMsgEl) {
      currentAvatarMsgEl.style.display = 'block';
  }


  const messageContainer = document.getElementById('messageContainer');
  if (messageContainer) messageContainer.innerHTML = '';
  
  updateStats(0, 0);
}

function copiarId() {
  const userIdInput = document.getElementById('userIdInput');
  if (!userIdInput) return;
  const userIdValue = userIdInput.value.trim();
  if (userIdValue) {
    navigator.clipboard.writeText(userIdValue).then(() => {
      showMessage('✅ ID copiado para a área de transferência!', 'success');
    }).catch(() => {
      showMessage('❌ Erro ao copiar ID. Verifique as permissões do navegador.', 'error');
    });
  } else {
    showMessage('❌ Nenhum ID para copiar. Busque um usuário primeiro.', 'error');
  }
}

function exportarDados() {
  if (!fetchedUserData) {
    showMessage('❌ Nenhum dado disponível para exportar. Busque um usuário primeiro.', 'error');
    return;
  }
  const userIdInput = document.getElementById('userIdInput');
  if (!userIdInput) return;

  const dataToExport = {
    exportDate: new Date().toISOString(),
    userId: userIdInput.value.trim(),
    userData: fetchedUserData,
    stats: {
      avatarsFound: document.getElementById('totalAvatars')?.textContent || '0',
      usernamesRegistered: document.getElementById('totalUsernames')?.textContent || '0',
      dataQuality: document.getElementById('dataQuality')?.textContent || '0%',
      lastQuery: document.getElementById('lastUpdate')?.textContent || '--',
    }
  };

  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `celestial_user_${dataToExport.userId}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showMessage('💾 Dados exportados com sucesso!', 'success');
}

function atualizarDados() {
  const userIdInput = document.getElementById('userIdInput');
  if (!userIdInput) return;
  const userIdValue = userIdInput.value.trim();
  if (userIdValue) {
    buscarDadosUsuario();
  } else {
    showMessage('❌ Digite um ID de usuário para atualizar os dados.', 'error');
  }
}

function limparResultados() {
  const userIdInput = document.getElementById('userIdInput');
  if(userIdInput) userIdInput.value = '';
  
  const resultsContainer = document.getElementById('resultsContainer');
  if(resultsContainer) resultsContainer.style.display = 'none';
  
  const statsContainer = document.getElementById('statsContainer');
  if(statsContainer) statsContainer.style.display = 'none';

  const messageContainer = document.getElementById('messageContainer');
  if(messageContainer) messageContainer.innerHTML = '';
  
  fetchedUserData = null;
  initializeUserInfoFields(); // Isso já chama updateStats(0,0)
  showMessage('🗑️ Resultados limpos com sucesso!', 'success');
}

function mostrarAjuda() {
  const helpText = `
🔍 COMO USAR O CELESTIAL TRACKER:
1️⃣ ENCONTRAR O ID DO USUÁRIO:
   • No Discord, ative o "Modo Desenvolvedor" (Configurações > Avançado).
   • Clique com o botão direito no nome do usuário.
   • Selecione "Copiar ID do Usuário".
   • O ID deve ter entre 17-19 dígitos.
2️⃣ BUSCAR DADOS:
   • Cole o ID no campo de busca.
   • Clique em "Buscar Dados" ou pressione Enter.
   • Aguarde o carregamento dos resultados.
3️⃣ RECURSOS DISPONÍVEIS:
   • 👤 Informações gerais e ID do usuário.
   • 📞 Detalhes da última atividade em canais de voz.
   • 📝 Histórico de nomes de usuário (Antigos Users).
   • 📸 Galeria de avatares antigos.
   • 📊 Estatísticas sobre os dados encontrados.
   • 💾 Exportar dados em formato JSON.
   • 📋 Copiar o ID do usuário pesquisado.
⚠️ IMPORTANTE:
   • Apenas usuários registrados pelo bot Celestial terão dados.
   • O histórico depende do período de monitoramento do bot.
   • Algumas informações podem não estar disponíveis se não foram capturadas.
❓ Precisa de mais ajuda? Entre em contato com a equipe Celestial!
  `;
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div style="background: #2f3136; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%; border: 2px solid #43b581; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow-y: auto; max-height: 80vh;">
      <h3 style="color: #43b581; margin-top: 0; border-bottom: 1px solid #40444b; padding-bottom: 10px;">📚 Guia do Celestial Tracker</h3>
      <pre style="color: #dcddde; line-height: 1.6; white-space: pre-wrap; font-family: inherit; font-size: 0.95rem;">${helpText}</pre>
      <button onclick="this.parentElement.parentElement.remove()" style="background: #7289da; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; margin-top: 20px; font-weight: 600; display: block; margin-left: auto; margin-right: auto;">✅ Entendi</button>
    </div>
  `;
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  document.body.appendChild(modal);
}

async function buscarDadosUsuario() {
  const userIdInput = document.getElementById('userIdInput');
  const resultsContainer = document.getElementById('resultsContainer');
  const statsContainer = document.getElementById('statsContainer');
  const searchBtn = document.getElementById('searchBtn');

  // Verifica se os elementos principais da UI do tracker estão presentes
  if (!userIdInput || !resultsContainer || !statsContainer || !searchBtn) {
    console.error("Elementos da UI do tracker não encontrados. Saindo da função buscarDadosUsuario.");
    // Não mostra mensagem de erro na UI aqui, pois pode ser a página de login
    return; 
  }

  const userId = userIdInput.value.trim();
  initializeUserInfoFields(); // Reseta campos antes de nova busca

  if (!userId) {
    showMessage("❌ Por favor, insira um ID de usuário válido.", 'error');
    resultsContainer.style.display = 'none';
    statsContainer.style.display = 'none';
    return;
  }
  if (!/^\d{17,19}$/.test(userId)) {
    showMessage("❌ ID do Discord deve conter apenas números e ter entre 17-19 dígitos.", 'error');
    resultsContainer.style.display = 'none';
    statsContainer.style.display = 'none';
    return;
  }

  searchBtn.classList.add('loading');
  searchBtn.querySelector('.btn-text').textContent = '🔍 Buscando...';

  resultsContainer.style.display = 'block';
  statsContainer.style.display = 'grid';

  try {
    const response = await fetch(`${API_BASE_URL}/api/avatars/${userId}`, { credentials: 'include' }); // URL COMPLETA E CREDENCIAIS

    if (!response.ok) {
      let errorMsg = `Erro ${response.status}: ${response.statusText || 'Erro desconhecido'}`;
      if (response.status === 401) {
        errorMsg = "❌ Não autorizado ou sessão expirada. Por favor, faça login novamente.";
        // Poderia redirecionar para login: window.location.href = 'index.html';
      } else if (response.status === 404) {
        errorMsg = "❌ Usuário não encontrado (DB ou Discord).";
      }
      // Tenta pegar uma mensagem de erro mais específica do corpo da resposta da API
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMsg = `❌ ${errorData.error}`;
        }
      } catch (e) { /* Ignora se o corpo do erro não for JSON */ }
      throw new Error(errorMsg);
    }

    const userData = await response.json();
    fetchedUserData = userData; // Armazena globalmente

    // --- Popular Informações Básicas ---
    document.getElementById('userInfoId').innerHTML = `<span class="value">${userData.userId || userId}</span>`;
    document.getElementById('currentUser').innerHTML = (userData.usernames && userData.usernames.length > 0)
      ? `<span class="value">${userData.usernames[userData.usernames.length - 1]}</span>`
      : '<span class="placeholder">Nenhum nome registrado</span>';
    document.getElementById('userStatus').innerHTML = '<span class="value status-online">✅ Dados Encontrados</span>';

    // --- Popular Informações de Call ---
    const lastJoinCallInfoEl = document.getElementById('lastJoinCallInfo');
    lastJoinCallInfoEl.innerHTML = (userData.lastJoinCall && userData.lastJoinCall.timestamp)
      ? `<span class="value">Canal: ${userData.lastJoinCall.channelId || 'N/A'} (${new Date(userData.lastJoinCall.timestamp).toLocaleString('pt-BR')})</span>`
      : '<span class="placeholder">Nenhuma entrada registrada</span>';

    const lastLeaveCallInfoEl = document.getElementById('lastLeaveCallInfo');
    lastLeaveCallInfoEl.innerHTML = (userData.lastLeaveCall && userData.lastLeaveCall.timestamp)
      ? `<span class="value">Canal: ${userData.lastLeaveCall.channelId || 'N/A'} (${new Date(userData.lastLeaveCall.timestamp).toLocaleString('pt-BR')})</span>`
      : '<span class="placeholder">Nenhuma saída registrada</span>';

    // --- Popular Avatar Atual ---
    const currentAvatarImg = document.getElementById('currentAvatarImg');
    const currentAvatarMsg = document.getElementById('currentAvatarMsg');
    if (userData.avatars && userData.avatars.length > 0) {
      currentAvatarImg.src = userData.avatars[userData.avatars.length - 1];
      currentAvatarImg.style.display = 'block';
      currentAvatarMsg.style.display = 'none';
    } else {
      currentAvatarImg.style.display = 'none';
      currentAvatarMsg.style.display = 'block';
      currentAvatarMsg.innerHTML = '<span class="placeholder">🖼️ Nenhum avatar atual.</span>';
    }

    // --- Popular Histórico de Nomes ---
    const oldUsernamesList = document.getElementById('oldUsernamesList');
    if (userData.usernames && userData.usernames.length > 0) {
      oldUsernamesList.innerHTML = "";
      userData.usernames.slice().reverse().forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        oldUsernamesList.appendChild(li);
      });
    } else {
      oldUsernamesList.innerHTML = '<li class="placeholder">🚫 Nenhum histórico de nomes.</li>';
    }

    // --- Popular Galeria de Avatares Antigos ---
    const oldAvatarsContainer = document.getElementById('oldAvatarsContainer');
    if (userData.avatars && userData.avatars.length > 0) {
      oldAvatarsContainer.innerHTML = "";
      userData.avatars.slice().reverse().forEach((url, index, arr) => {
        const avatarItem = document.createElement("div");
        avatarItem.className = "avatar-item";
        const img = document.createElement("img");
        img.src = url;
        const avatarNumber = arr.length - index;
        img.alt = `Avatar antigo ${avatarNumber}`;
        img.title = `Avatar ${avatarNumber} - Clique para ampliar`;
        const dateSpan = document.createElement("span");
        dateSpan.className = "avatar-date";
        dateSpan.textContent = `Avatar #${avatarNumber}`;
        
        img.onerror = () => { /* ... tratamento de erro de imagem ... */ 
            img.alt = "❌ Avatar indisponível";
            img.style.border = "3px dashed #f04747"; img.style.opacity = "0.5";
            dateSpan.textContent = "❌ Erro"; dateSpan.style.color = "#f04747";
        };
        img.onclick = () => { /* ... lógica do modal ... */
            const modal = document.createElement('div'); modal.className = 'modal-overlay';
            const modalImg = document.createElement('img'); modalImg.src = url;
            modalImg.className = 'modal-content'; modal.appendChild(modalImg);
            modal.onclick = () => modal.remove(); document.body.appendChild(modal);
        };
        avatarItem.appendChild(img);
        avatarItem.appendChild(dateSpan);
        oldAvatarsContainer.appendChild(avatarItem);
      });
    } else {
      oldAvatarsContainer.innerHTML = '<p class="placeholder">🚫 Nenhum avatar antigo.</p>';
    }

    updateStats(userData.avatars?.length || 0, userData.usernames?.length || 0);
    showMessage(`✅ Dados carregados para o usuário ${userId}!`, 'success');

  } catch (err) {
    console.error("Erro ao buscar dados do tracker:", err);
    showMessage(err.message || "❌ Ocorreu um erro desconhecido.", 'error');
    // Resetar campos para estado de erro
    document.getElementById('userInfoId').innerHTML = `<span class="value">${userId || 'N/A'}</span>`;
    document.getElementById('currentUser').innerHTML = '<span class="placeholder status-error">❌ Erro</span>';
    document.getElementById('userStatus').innerHTML = '<span class="value status-error">❌ Erro Consulta</span>';
    document.getElementById('lastJoinCallInfo').innerHTML = '<span class="placeholder status-error">❌ Erro</span>';
    document.getElementById('lastLeaveCallInfo').innerHTML = '<span class="placeholder status-error">❌ Erro</span>';
    document.getElementById('currentAvatarMsg').innerHTML = '<span class="placeholder status-error">❌ Erro</span>';
    document.getElementById('oldUsernamesList').innerHTML = '<li class="placeholder status-error">❌ Erro Histórico</li>';
    document.getElementById('oldAvatarsContainer').innerHTML = '<p class="placeholder status-error">❌ Erro Avatares</p>';
    updateStats(0, 0);
  } finally {
    searchBtn.classList.remove('loading');
    searchBtn.querySelector('.btn-text').textContent = '🔍 Buscar Dados';
  }
}

// Event listeners para os botões de ação do tracker
// Adicionados apenas se os botões existirem (para não dar erro na página de login)
if (document.getElementById('searchBtn')) {
    document.getElementById('searchBtn').onclick = buscarDadosUsuario;
}
if (document.getElementById('clearBtn')) {
    document.getElementById('clearBtn').onclick = limparResultados;
}
if (document.getElementById('helpBtn')) {
    document.getElementById('helpBtn').onclick = mostrarAjuda;
}
// Os botões dentro do resultsContainer são adicionados dinamicamente ou já têm onclick no HTML

// Event listeners para o input de ID
const userIdInputElement = document.getElementById('userIdInput');
if (userIdInputElement) {
    userIdInputElement.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarDadosUsuario();
        }
    });
    userIdInputElement.addEventListener('input', function(e) {
        const value = e.target.value;
        if (value && !/^\d*$/.test(value)) {
            e.target.value = value.replace(/\D/g, '');
        }
    });
}

// Chamada inicial para campos da dashboard, mas só se estivermos na dashboard
// A lógica no topo com DOMContentLoaded já cuida da inicialização da UI do usuário logado
// A inicialização dos campos do tracker (initializeUserInfoFields) é chamada por buscarDadosUsuario e limparResultados.
// Se os containers de stats e results devem estar escondidos por padrão, o CSS ou o HTML inicial devem garantir isso.
// O script já faz:
// document.addEventListener('DOMContentLoaded', () => {
//     if(document.getElementById('statsContainer')) document.getElementById('statsContainer').style.display = 'none';
//     if(document.getElementById('resultsContainer')) document.getElementById('resultsContainer').style.display = 'none';
// });
// No entanto, essa parte já está no seu HTML inicial com style="display: none;", então não precisa duplicar aqui,
// a menos que queira garantir via JS.
