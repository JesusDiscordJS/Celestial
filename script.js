// global variable to store current user data from API
let fetchedUserData = null;

function showMessage(message, type = 'error') {
  const messageContainer = document.getElementById('messageContainer');
  const messageElement = document.createElement('div');
  messageElement.className = type === 'error' ? '' : 'success-message'; // Empty class will default to #errorMessage styling
  messageElement.id = type === 'error' ? 'errorMessage' : 'successMessage';
  messageElement.textContent = message;
  messageElement.style.display = 'block'; // Ensure it's visible

  messageContainer.innerHTML = ''; // Clear previous messages
  messageContainer.appendChild(messageElement);

  // Auto-hide message
  setTimeout(() => {
    messageElement.style.opacity = '0'; // Start fade out
    setTimeout(() => messageElement.remove(), 300); // Remove after fade
  }, 6000);
}

function updateStats(avatarCount = 0, usernameCount = 0) {
  const quality = Math.min(100, Math.round(((avatarCount + usernameCount) / 20) * 100)); // Simple quality metric

  document.getElementById('totalAvatars').textContent = avatarCount;
  document.getElementById('totalUsernames').textContent = usernameCount;
  document.getElementById('dataQuality').textContent = quality + '%';
  document.getElementById('lastUpdate').textContent = new Date().toLocaleDateString('pt-BR');

  // Update badges in sections
  document.getElementById('avatarCount').textContent = `${avatarCount} avatares`;
  document.getElementById('usernameCount').textContent = `${usernameCount} registros`;
}


function initializeUserInfoFields() {
  document.getElementById('userInfoId').innerHTML = '<span class="placeholder">🔄 Carregando...</span>';
  document.getElementById('currentUser').innerHTML = '<span class="placeholder">🔄 Carregando...</span>';
  document.getElementById('userStatus').innerHTML = '<span class="placeholder">🔄 Verificando...</span>';
  document.getElementById('lastJoinCallInfo').innerHTML = '<span class="placeholder">🔄 Carregando...</span>';
  document.getElementById('lastLeaveCallInfo').innerHTML = '<span class="placeholder">🔄 Carregando...</span>';

  const currentAvatarImg = document.getElementById('currentAvatarImg');
  currentAvatarImg.style.display = 'none';
  currentAvatarImg.src = '#';
  document.getElementById('currentAvatarMsg').style.display = 'block';
  document.getElementById('currentAvatarMsg').innerHTML = '<span class="placeholder">🔄 Carregando avatar...</span>';
  document.getElementById('currentAvatarMsg').className = 'placeholder'; // Reset class

  document.getElementById('oldUsernamesList').innerHTML = '<li class="placeholder">🔄 Carregando histórico de nomes...</li>';
  document.getElementById('oldAvatarsContainer').innerHTML = '<p id="oldAvatarsMsg" class="placeholder">🔄 Carregando galeria de avatares...</p>';

  document.getElementById('messageContainer').innerHTML = ''; // Clear any previous messages
  updateStats(0, 0); // Reset stats
}

function copiarId() {
  const userIdValue = document.getElementById('userIdInput').value.trim();
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

  const dataToExport = {
    exportDate: new Date().toISOString(),
    userId: document.getElementById('userIdInput').value.trim(), // Get current input value for reference
    userData: fetchedUserData, // Use the globally stored fetched data
    stats: {
      avatarsFound: document.getElementById('totalAvatars').textContent,
      usernamesRegistered: document.getElementById('totalUsernames').textContent,
      dataQuality: document.getElementById('dataQuality').textContent,
      lastQuery: document.getElementById('lastUpdate').textContent,
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
  const userIdValue = document.getElementById('userIdInput').value.trim();
  if (userIdValue) {
    buscarDadosUsuario(); // Re-fetch data for the current ID
  } else {
    showMessage('❌ Digite um ID de usuário para atualizar os dados.', 'error');
  }
}

function limparResultados() {
  document.getElementById('userIdInput').value = '';
  document.getElementById('resultsContainer').style.display = 'none';
  document.getElementById('statsContainer').style.display = 'none';
  document.getElementById('messageContainer').innerHTML = '';
  fetchedUserData = null; // Clear stored data
  initializeUserInfoFields(); // Reset all fields to their initial placeholder state
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
    if (e.target === modal) modal.remove(); // Close if background is clicked
  };

  document.body.appendChild(modal);
}

async function buscarDadosUsuario() {
  const userId = document.getElementById('userIdInput').value.trim();
  const resultsContainer = document.getElementById('resultsContainer');
  const statsContainer = document.getElementById('statsContainer');
  const searchBtn = document.getElementById('searchBtn');

  initializeUserInfoFields(); // Reset fields before new search

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

  resultsContainer.style.display = 'block'; // Show results area (with placeholders)
  statsContainer.style.display = 'grid'; // Show stats area (with placeholders)

  try {
    // IMPORTANT: Assuming API endpoint returns all necessary data: userId, avatars, usernames, lastJoinCall, lastLeaveCall
    const response = await fetch(`https://celestial-api.onrender.com/api/avatars/${userId}`);

    if (!response.ok) {
      let errorMsg = `Erro ${response.status}: ${response.statusText}`;
      if (response.status === 404) {
        errorMsg = "❌ Usuário não encontrado na base de dados do Celestial. Verifique o ID ou o usuário pode não ter sido monitorado.";
      } else {
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMsg = `❌ ${errorData.error}`;
          }
        } catch (e) { /* Ignore if error response is not JSON */ }
      }
      throw new Error(errorMsg);
    }

    const userData = await response.json();
    fetchedUserData = userData; // Store globally

    // --- Populate Basic User Info ---
    document.getElementById('userInfoId').innerHTML = `<span class="value">${userData.userId || userId}</span>`;

    if (userData.usernames && userData.usernames.length > 0) {
      // Display the last username in the array as the "current" one
      document.getElementById('currentUser').innerHTML = `<span class="value">${userData.usernames[userData.usernames.length - 1]}</span>`;
    } else {
      document.getElementById('currentUser').innerHTML = '<span class="placeholder">Nenhum nome registrado</span>';
    }
    document.getElementById('userStatus').innerHTML = '<span class="value status-online">✅ Dados Encontrados</span>';

    // --- Populate Call Info ---
    const lastJoinCallInfoEl = document.getElementById('lastJoinCallInfo');
    if (userData.lastJoinCall && userData.lastJoinCall.timestamp) {
      lastJoinCallInfoEl.innerHTML = `<span class="value">Canal: ${userData.lastJoinCall.channelId || 'N/A'} (${new Date(userData.lastJoinCall.timestamp).toLocaleString('pt-BR')})</span>`;
    } else {
      lastJoinCallInfoEl.innerHTML = '<span class="placeholder">Nenhuma entrada registrada</span>';
    }

    const lastLeaveCallInfoEl = document.getElementById('lastLeaveCallInfo');
    if (userData.lastLeaveCall && userData.lastLeaveCall.timestamp) {
      lastLeaveCallInfoEl.innerHTML = `<span class="value">Canal: ${userData.lastLeaveCall.channelId || 'N/A'} (${new Date(userData.lastLeaveCall.timestamp).toLocaleString('pt-BR')})</span>`;
    } else {
      lastLeaveCallInfoEl.innerHTML = '<span class="placeholder">Nenhuma saída registrada</span>';
    }

    // --- Populate Current Avatar ---
    const currentAvatarImg = document.getElementById('currentAvatarImg');
    const currentAvatarMsg = document.getElementById('currentAvatarMsg');
    if (userData.avatars && userData.avatars.length > 0) {
      // Assuming the last avatar in the array is the most current one for display here
      const currentAvatarUrl = userData.avatars[userData.avatars.length - 1];
      currentAvatarImg.src = currentAvatarUrl;
      currentAvatarImg.style.display = 'block';
      currentAvatarMsg.style.display = 'none';
    } else {
      currentAvatarImg.style.display = 'none';
      currentAvatarMsg.style.display = 'block';
      currentAvatarMsg.innerHTML = '<span class="placeholder">🖼️ Nenhum avatar atual encontrado.</span>';
    }

    // --- Populate Old Usernames (Antigos Users) ---
    const oldUsernamesList = document.getElementById('oldUsernamesList');
    if (userData.usernames && userData.usernames.length > 0) {
      oldUsernamesList.innerHTML = ""; // Clear placeholder
      userData.usernames.slice().reverse().forEach(name => { // Display newest first
        const li = document.createElement('li');
        li.textContent = name;
        // If timestamps were available with usernames, they would be added here
        oldUsernamesList.appendChild(li);
      });
    } else {
      oldUsernamesList.innerHTML = '<li class="placeholder">🚫 Nenhum histórico de nomes encontrado.</li>';
    }

    // --- Populate Old Avatars Gallery ---
    const oldAvatarsContainer = document.getElementById('oldAvatarsContainer');
    if (userData.avatars && userData.avatars.length > 0) {
      oldAvatarsContainer.innerHTML = ""; // Clear placeholder
      let loadedImages = 0;
      const totalImages = userData.avatars.length;

      userData.avatars.slice().reverse().forEach((url, index) => { // Display newest first
        const avatarItem = document.createElement("div");
        avatarItem.className = "avatar-item";

        const img = document.createElement("img");
        img.src = url;
        // Use a generic alt, or index from the original array if needed for chronology
        img.alt = `Avatar antigo ${totalImages - index}`;
        img.title = `Avatar ${totalImages - index} - Clique para ampliar`;

        const dateSpan = document.createElement("span");
        dateSpan.className = "avatar-date";
        dateSpan.textContent = `Avatar #${totalImages - index}`; // Simple numbering

        img.onload = () => loadedImages++;
        img.onerror = () => {
          img.alt = "❌ Avatar indisponível";
          img.style.border = "3px dashed #f04747";
          img.style.opacity = "0.5";
          dateSpan.textContent = "❌ Erro";
          dateSpan.style.color = "#f04747";
          loadedImages++;
        };

        img.onclick = () => {
          const modal = document.createElement('div');
          modal.className = 'modal-overlay';
          const modalImg = document.createElement('img');
          modalImg.src = url;
          modalImg.className = 'modal-content';
          modal.appendChild(modalImg);
          modal.onclick = () => modal.remove();
          document.body.appendChild(modal);
        };

        avatarItem.appendChild(img);
        avatarItem.appendChild(dateSpan);
        oldAvatarsContainer.appendChild(avatarItem);
      });
       if (userData.avatars.length === 0 && loadedImages === 0) { // double check after loop if somehow empty
            oldAvatarsContainer.innerHTML = '<p class="placeholder">🚫 Nenhum avatar antigo encontrado para este usuário.</p>';
       }
    } else {
      oldAvatarsContainer.innerHTML = '<p class="placeholder">🚫 Nenhum avatar antigo encontrado para este usuário.</p>';
    }

    updateStats(userData.avatars?.length || 0, userData.usernames?.length || 0);
    if ((userData.avatars?.length || 0) > 0 || (userData.usernames?.length || 0) > 0) {
        showMessage(`✅ Dados carregados para o usuário ${userId}!`, 'success');
    } else {
        showMessage(`⚠️ Nenhum dado histórico (avatares ou nomes) encontrado para ${userId}, mas a consulta foi bem-sucedida.`, 'success'); // Or 'error' if this state is an error
    }


  } catch (err) {
    console.error("Erro ao buscar dados:", err);
    showMessage(err.message || "❌ Ocorreu um erro desconhecido ao buscar os dados.", 'error');

    // Update fields to show error state
    document.getElementById('userInfoId').innerHTML = `<span class="value">${userId}</span>`; // Still show ID searched
    document.getElementById('currentUser').innerHTML = '<span class="placeholder status-error">❌ Erro</span>';
    document.getElementById('userStatus').innerHTML = '<span class="value status-error">❌ Erro na Consulta</span>';
    document.getElementById('lastJoinCallInfo').innerHTML = '<span class="placeholder status-error">❌ Erro</span>';
    document.getElementById('lastLeaveCallInfo').innerHTML = '<span class="placeholder status-error">❌ Erro</span>';
    document.getElementById('currentAvatarMsg').innerHTML = '<span class="placeholder status-error">❌ Erro ao carregar</span>';
    document.getElementById('oldUsernamesList').innerHTML = '<li class="placeholder status-error">❌ Erro ao carregar histórico</li>';
    document.getElementById('oldAvatarsContainer').innerHTML = '<p class="placeholder status-error">❌ Erro ao carregar avatares.</p>';

    updateStats(0, 0); // Reset stats on error
    // resultsContainer.style.display = 'none'; // Optionally hide results on total failure, or show error placeholders
    // statsContainer.style.display = 'none';
  } finally {
    searchBtn.classList.remove('loading');
    searchBtn.querySelector('.btn-text').textContent = '🔍 Buscar Dados';
  }
}

// Event listeners
document.getElementById('userIdInput').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    buscarDadosUsuario();
  }
});

document.getElementById('userIdInput').addEventListener('input', function(e) {
  const value = e.target.value;
  if (value && !/^\d*$/.test(value)) { // Allow only digits
    e.target.value = value.replace(/\D/g, '');
  }
});

// Initialize stats on page load (optional, if stats are always visible)
// updateStats(0,0);
// Or ensure they are hidden initially and shown on search
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('statsContainer').style.display = 'none';
    document.getElementById('resultsContainer').style.display = 'none';
});