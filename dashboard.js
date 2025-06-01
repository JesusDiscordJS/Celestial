document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://celestial-api.onrender.com';

    const userListContainer = document.getElementById('userListContainer');
    const userContentArea = document.getElementById('userContentArea');
    const searchUserIdInput = document.getElementById('searchUserIdInput');
    const searchUserBtn = document.getElementById('searchUserBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const filterButtons = document.querySelectorAll('.dashboard-sidebar .filter-btn');
    const paginationControlsDiv = document.querySelector('.pagination-controls'); // Para ocultar

    // Elementos de paginação (não serão mais usados para a lista principal)
    // const prevPageBtn = document.getElementById('prevPageBtn');
    // const nextPageBtn = document.getElementById('nextPageBtn');
    // const currentPageSpan = document.getElementById('currentPageSpan');

    // let currentPage = 0; // Não mais necessário para a lista principal
    // const usersPerPage = 10; // Não mais necessário para a lista principal

    let currentUserData = null;
    let currentFilter = 'summary';

    function showLoading(show = true) {
        if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

Sim, você tem razão em apontar se as datas estão aparecendo incorretamente. O problema provavelmente está na forma como a função formatDate no seu dashboard.js está interpretando as strings de data que vêm da API.

Se a sua API está retornando datas como strings no formato ISO 8601 (ex: "2025-06-01T21:21:08.147Z"), como no exemplo que você mostrou, a versão anterior da função formatDate poderia interpretá-las incorretamente ao tentar usar parseInt diretamente na string ISO.

Vamos corrigir a função formatDate e também a formatDateForSort (usada para ordenar os usuários por data) no seu dashboard.js para lidar de forma mais robusta com os formatos de data que sua API pode estar enviando (sejam strings ISO ou timestamps numéricos).

Substitua as funções formatDate e formatDateForSort no seu arquivo dashboard.js pelas seguintes:

JavaScript

// Coloque estas funções dentro do seu `dashboard.js`
// (substituindo as versões antigas delas)

function formatDate(dateSource) {
    if (!dateSource) return 'N/A';
    let date;

    // 1. Se for um objeto EJSON (formato interno do MongoDB antes da conversão da API)
    if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) {
        const dateValue = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date;
        date = new Date(dateValue);
    }
    // 2. Se for um número (timestamp em milissegundos, como a API deveria retornar)
    else if (typeof dateSource === 'number') {
        date = new Date(dateSource);
    }
    // 3. Se for uma string (pode ser ISO 8601 ou um timestamp como string)
    else if (typeof dateSource === 'string') {
        // Tenta identificar se é uma string ISO ou similar, ou um timestamp numérico como string
        if (dateSource.includes('-') || dateSource.includes(':') || dateSource.includes('T') || dateSource.includes('Z')) {
            date = new Date(dateSource); // Tenta parsear como string de data complexa (ISO)
        } else {
            // Se for uma string puramente numérica, trata como timestamp
            const parsedTimestamp = parseInt(dateSource, 10);
            if (!isNaN(parsedTimestamp) && parsedTimestamp.toString().length === dateSource.length) {
                date = new Date(parsedTimestamp);
            } else {
                // Se não for puramente numérica, mas também não parece ISO, tenta parsear como string de data mesmo assim
                date = new Date(dateSource);
            }
        }
    }
    // 4. Se não for nenhum dos formatos esperados
    else {
        return 'Formato Desconhecido';
    }

    // Validação final da data
    if (!date || isNaN(date.getTime()) || date.getTime() <= 0) {
        // Se a data ainda for inválida, e a fonte original era uma string,
        // faz uma última tentativa de parse direto, pois pode ser um formato que new Date() entende mas nossa heurística não.
        if (typeof dateSource === 'string') {
            let lastAttemptDate = new Date(dateSource);
            if (lastAttemptDate && !isNaN(lastAttemptDate.getTime()) && lastAttemptDate.getTime() > 0) {
                date = lastAttemptDate;
            } else {
                 return `Data Inválida [${typeof dateSource}: ${dateSource}]`;
            }
        } else {
            return `Data Inválida [${typeof dateSource}]`;
        }
    }

    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
        // timeZone: 'UTC' // Descomente se quiser forçar a exibição em UTC
    });
}

function formatDateForSort(dateSource) {
    if (!dateSource) return 0; // Retorna 0 para ordenação (data mais antiga)

    // 1. EJSON
    if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) {
        // Se $numberLong existir, é um timestamp. Senão, dateSource.$date pode ser uma string ISO.
        const potentialTimestamp = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date;
        if (typeof potentialTimestamp === 'number') return potentialTimestamp;
        // Se potentialTimestamp for uma string (ISO), converte para timestamp
        const d = new Date(potentialTimestamp);
        return !isNaN(d.getTime()) ? d.getTime() : 0;
    }
    // 2. Number (já é timestamp)
    if (typeof dateSource === 'number') {
        return dateSource;
    }
    // 3. String (pode ser ISO ou timestamp como string)
    if (typeof dateSource === 'string') {
        // Tenta converter para data e pegar o timestamp
        const d = new Date(dateSource);
        if (!isNaN(d.getTime()) && d.getTime() > 0) { // Se for uma string de data válida (ex: ISO)
            return d.getTime();
        }
        // Se for uma string puramente numérica
        const n = parseInt(dateSource, 10);
        if (!isNaN(n) && n.toString().length === dateSource.length) {
            return n;
        }
    }
    return 0; // Fallback para formatos não reconhecidos ou datas inválidas
}

    async function fetchAllTrackedUsers() { // Renomeada e modificada para buscar todos
        showLoading(true);
        if (paginationControlsDiv) paginationControlsDiv.style.display = 'none'; // Oculta controles de paginação

        try {
            // Remove skip e limit para buscar todos os usuários
            const response = await fetch(`${API_BASE_URL}/users`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
            }
            const users = await response.json();
            // Ordenar usuários pela 'last_seen_overall_at' mais recente primeiro
            users.sort((a, b) => {
                const dateA = a.last_seen_overall_at ? new Date(formatDateForSort(a.last_seen_overall_at)).getTime() : 0;
                const dateB = b.last_seen_overall_at ? new Date(formatDateForSort(b.last_seen_overall_at)).getTime() : 0;
                return dateB - dateA;
            });
            displayUserList(users);
        } catch (error) {
            console.error('Erro ao buscar todos os usuários:', error);
            if (userListContainer) userListContainer.innerHTML = `<p class="error-message">Falha ao carregar usuários: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    // Função auxiliar para converter datas antes de ordenar, pois formatDate pode retornar 'N/A'
    function formatDateForSort(dateSource) {
        if (!dateSource) return 0; // ou uma data muito antiga para ir para o fim
        if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) {
            return dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong) : dateSource.$date;
        }
        return dateSource; // Assume que já é um timestamp ou string de data ISO
    }


    function displayUserList(users) {
        if (!userListContainer) {
            console.error("Elemento userListContainer não encontrado!");
            return;
        }
        userListContainer.innerHTML = '';

        if (!users || users.length === 0) {
            userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Nenhum usuário rastreado encontrado.</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'user-list';
        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'user-list-item-enhanced';

            let userIdDisplayValue = 'N/A';
            let dataUserIdValue = '';

            if (user.user_id) {
                 userIdDisplayValue = user.user_id.toString(); // API já deve retornar como string
                 dataUserIdValue = user.user_id.toString();
            }
            
            const latestAvatar = (user.current_avatar_url || (user.avatar_url_history && user.avatar_url_history.length > 0 ? user.avatar_url_history[user.avatar_url_history.length - 1] : null)) || 'https://via.placeholder.com/55?text=?';
            const currentUsername = user.current_username_global || user.username_global_history?.slice(-1)[0] || 'Nome Desconhecido';


            let lastServerDisplay = '<span class="info-value placeholder">Nenhum</span>';
            if (user.servers && user.servers.length > 0) {
                const lastServer = user.servers.slice().sort((a,b) => new Date(formatDateForSort(b.last_message_at || b.first_message_at)).getTime() - new Date(formatDateForSort(a.last_message_at || a.first_message_at)).getTime())[0];
                const serverName = lastServer.guild_name;
                if (serverName && typeof serverName === 'string') {
                    lastServerDisplay = `<span class="info-value">${escapeHTML(serverName)}</span>`;
                } else {
                    lastServerDisplay = '<span class="info-value placeholder">Nome Indisponível</span>';
                }
            }

            let lastActivityDateDisplay = '<span class="info-value placeholder">Nenhuma</span>';
            if (user.last_seen_overall_at) {
                 lastActivityDateDisplay = `<span class="info-value">${formatDate(user.last_seen_overall_at)}</span>`;
            } else if (user.recent_messages && user.recent_messages.length > 0) {
                // Fallback para a última mensagem se last_seen_overall_at não estiver disponível
                lastActivityDateDisplay = `<span class="info-value">${formatDate(user.recent_messages.slice().sort((a,b) => new Date(formatDateForSort(b.timestamp)).getTime() - new Date(formatDateForSort(a.timestamp)).getTime())[0].timestamp)}</span>`;
            }


            li.innerHTML = `
                <img src="${latestAvatar}" alt="Avatar de ${escapeHTML(currentUsername)}" class="user-avatar-small">
                <div class="user-info-column">
                    <span class="username">${escapeHTML(currentUsername)}</span>
                    <span class="user-id">ID: ${escapeHTML(userIdDisplayValue)}</span>
                </div>
                <div class="server-info-column">
                    <span class="info-label"><i class="fas fa-server" style="margin-right: 5px;"></i>Último Servidor Ativo</span>
                    ${lastServerDisplay}
                </div>
                <div class="last-update-column">
                    <span class="info-label"><i class="fas fa-history" style="margin-right: 5px;"></i>Última Atividade Geral</span>
                    ${lastActivityDateDisplay}
                </div>
                <button class="dashboard-btn view-profile-btn" data-userid="${escapeHTML(dataUserIdValue)}">
                    <i class="fas fa-eye" style="margin-right: 5px;"></i>Ver Perfil
                </button>
            `;

            const viewProfileButton = li.querySelector('.view-profile-btn');
            if (viewProfileButton) {
                viewProfileButton.addEventListener('click', () => {
                    const userIdToFetch = viewProfileButton.dataset.userid;
                    if (userIdToFetch && userIdToFetch !== 'N/A' && !userIdToFetch.startsWith('[')) {
                        fetchAndDisplayUser(userIdToFetch, 'summary');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        alert("Não é possível carregar o perfil: ID de usuário inválido.");
                    }
                });
            }
            ul.appendChild(li);
        });
        userListContainer.appendChild(ul);
    }

    async function fetchAndDisplayUser(userId, filterToShow = 'summary') {
        if (!userId) {
            userContentArea.innerHTML = '<p class="error-message">ID de usuário inválido.</p>';
            return;
        }
        showLoading(true);
        currentUserData = null;
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                 if (response.status === 404) {
                    userContentArea.innerHTML = `<p class="error-message">Usuário com ID ${escapeHTML(userId)} não encontrado.</p>`;
                } else {
                    throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
                }
                return;
            }
            currentUserData = await response.json();
            currentFilter = filterToShow;
            updateActiveFilterButton();
            renderFilteredContent();
        } catch (error) {
            console.error(`Erro ao buscar detalhes do usuário ${userId}:`, error);
            userContentArea.innerHTML = `<p class="error-message">Falha ao carregar detalhes do usuário: ${error.message}</p>`;
            currentUserData = null;
        } finally {
            showLoading(false);
        }
    }
    
    function updateActiveFilterButton() {
        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === currentFilter);
        });
    }

    function renderFilteredContent() {
        if (!userContentArea) return;
        userContentArea.innerHTML = ''; 

        if (!currentUserData) {
            userContentArea.innerHTML = `<p class="placeholder-text">
                <i class="fas fa-user-slash" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i>
                Nenhum usuário selecionado. <br> Pesquise por um ID ou selecione da lista.
            </p>`;
            return;
        }

        let contentHTML = '';
        switch (currentFilter) {
            case 'summary': contentHTML = renderSummaryView(currentUserData); break;
            case 'avatars': contentHTML = renderAvatarsView(currentUserData); break;
            case 'banners': contentHTML = renderBannersView(currentUserData); break;
            case 'nicknames': contentHTML = renderNicknamesView(currentUserData); break;
            case 'servers': contentHTML = renderServersView(currentUserData); break;
            case 'messages': contentHTML = renderMessagesView(currentUserData); break; // NOVA CASE
            case 'fullHistory': contentHTML = renderFullHistoryView(currentUserData); break;
            default: contentHTML = '<p class="error-message">Filtro desconhecido.</p>';
        }
        userContentArea.innerHTML = contentHTML;
    }

    function renderSummaryView(user) {
        const latestAvatar = user.current_avatar_url || (user.avatar_url_history && user.avatar_url_history.length > 0 ? user.avatar_url_history[user.avatar_url_history.length - 1] : 'https://via.placeholder.com/128?text=?');
        // Para banner, a API pode não ter um current_banner_url explícito, então pegamos o último do histórico se existir
        const latestBanner = (user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls[user.banner_urls.length - 1] : '';
        const avatarCount = user.avatar_url_history ? user.avatar_url_history.length : 0;
        const bannerCount = user.banner_urls ? user.banner_urls.length : 0;
        const nicknameCount = user.username_global_history ? new Set(user.username_global_history.filter(n => n)).size : 0; 
        const serverCount = user.servers ? user.servers.length : 0;
        const historyCount = user.history ? user.history.length : 0; // 'history' é o log de alterações, não de apelidos de servidor
        const messageCount = user.recent_messages ? user.recent_messages.length : 0;
        
        let userIdForDisplay = user.user_id ? user.user_id.toString() : 'N/A';
        const currentUsername = user.current_username_global || user.username_global_history?.slice(-1)[0] || 'N/A';

        return `
            <div class="profile-section user-main-info">
                ${latestBanner ? `<div class="profile-banner" style="height:180px; border-radius:12px 12px 0 0; background-image: url('${latestBanner}'); background-size:cover; background-position:center;"></div>` : '<div class="profile-banner-placeholder" style="height:120px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2); border-radius:12px 12px 0 0; color:#888;"><span>Sem Banner Registrado</span></div>'}
                <div style="display:flex; align-items:flex-end; margin-top:-60px; padding:0 25px 25px 25px; position:relative; z-index:1;">
                    <img src="${latestAvatar}" alt="Avatar" style="width:120px; height:120px; border-radius:50%; border:5px solid #18191c; background:#18191c;">
                    <div style="margin-left:20px; padding-bottom:10px;">
                        <h2 style="color:#fff; font-size:2em; margin:0 0 5px 0; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${escapeHTML(currentUsername)}</h2>
                        <p style="color:#b9bbbe; font-size:1.1em; margin:0;">ID: ${escapeHTML(userIdForDisplay)}</p>
                    </div>
                </div>
            </div>
            <div class="profile-section quick-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:15px;"> 
            <div class="profile-section quick-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 180px)); gap:15px; justify-content: space-evenly;">
                <div class="widget"><h3><i class="fas fa-user-edit"></i> Nomes Globais</h3><p>${nicknameCount}</p></div>
                <div class="widget"><h3><i class="fas fa-image"></i> Avatares</h3><p>${avatarCount}</p></div>
                <div class="widget"><h3><i class="fas fa-images"></i> Banners</h3><p>${bannerCount}</p></div>
                <div class="widget"><h3><i class="fas fa-server"></i> Servidores</h3><p>${serverCount}</p></div>
                <div class="widget"><h3><i class="fas fa-comments"></i> Mensagens</h3><p>${messageCount}</p></div>
                <div class="widget"><h3><i class="fas fa-history"></i> Logs Hist.</h3><p>${historyCount}</p></div>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-info-circle"></i> Informações Gerais</h3>
                <ul class="profile-list">
                    <li><strong>Primeira vez registrado:</strong> ${formatDate(user.first_seen_overall_at)}</li>
                    <li><strong>Última atividade geral:</strong> ${formatDate(user.last_seen_overall_at)}</li>
                </ul>
            </div>
        `;
    }

    function renderAvatarsView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-image"></i> Galeria de Avatares</h3>';
        if (user.avatar_url_history && user.avatar_url_history.length > 0) {
            html += '<div class="avatar-gallery">';
            user.avatar_url_history.slice().reverse().forEach(url => { // Mais recentes primeiro
                html += `<img src="${url}" alt="Avatar Histórico" class="history-avatar" onclick="window.open('${url}', '_blank')" title="Clique para abrir em nova aba">`;
            });
            html += '</div>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhum avatar histórico encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderBannersView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-images"></i> Galeria de Banners</h3>';
        if (user.banner_urls && user.banner_urls.length > 0) {
            html += '<div class="banner-gallery">';
            user.banner_urls.slice().reverse().forEach(url => { // Mais recentes primeiro
                html += `<img src="${url}" alt="Banner Histórico" class="history-banner" onclick="window.open('${url}', '_blank')" title="Clique para abrir em nova aba">`;
            });
            html += '</div>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhum banner histórico encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderNicknamesView(user) { // Mostra username_global_history
        let html = '<div class="profile-section"><h3><i class="fas fa-signature"></i> Histórico de Nomes Globais</h3>';
        if (user.username_global_history && user.username_global_history.length > 0) {
            html += '<ul class="profile-list">';
             // Para mostrar data, precisaríamos que o histórico de nomes estivesse atrelado a 'history' do DB.
             // Por agora, apenas listamos os nomes da array username_global_history.
            const uniqueNames = [...new Set(user.username_global_history)].reverse(); // Mais recentes primeiro, únicos
            uniqueNames.forEach(name => {
                html += `<li><strong>${escapeHTML(name) || 'N/A'}</strong></li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhum nome global histórico encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderServersView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-server"></i> Servidores Encontrados</h3>';
        if (user.servers && user.servers.length > 0) {
            html += '<ul class="profile-list">';
            const sortedServers = user.servers.slice().sort((a,b) => {
                const dateA = new Date(formatDateForSort(a.last_message_at || a.first_message_at)).getTime();
                const dateB = new Date(formatDateForSort(b.last_message_at || b.first_message_at)).getTime();
                return dateB - dateA;
            });
            sortedServers.forEach(server => {
                html += `<li><strong>${escapeHTML(server.guild_name) || 'Nome Desconhecido'}</strong> (ID: ${escapeHTML(server.guild_id)})
                           <br><small style="color:#8a909a;">Primeira msg: ${formatDate(server.first_message_at)}</small>
                           <br><small style="color:#8a909a;">Última msg: ${formatDate(server.last_message_at)}</small></li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhum servidor registrado para este usuário.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderMessagesView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-comments"></i> Mensagens Recentes (Últimas 10)</h3>';
        if (user.recent_messages && user.recent_messages.length > 0) {
            html += '<ul class="profile-list messages-list">';
            // A API já salva as mais recentes no final do array e fatia para 10.
            // Para mostrar a mais nova primeiro na UI, invertemos a cópia do array.
            user.recent_messages.slice().reverse().forEach(msg => {
                html += `
                    <li class="message-item">
                        <div class="message-header">
                            <strong style="color:#06b6d4;">${escapeHTML(msg.guild_name) || 'Servidor Desconhecido'}</strong>
                            <span class="message-timestamp">${formatDate(msg.timestamp)}</span>
                        </div>
                        <div class="message-content">
                            ${msg.content ? `<p class="message-text">${escapeHTML(msg.content)}</p>` : '<p class="message-text placeholder-text" style="font-size:0.9em; padding:0; min-height:auto; border:none; background:none;"><em>(Sem texto na mensagem)</em></p>'}
                            ${msg.image_url ? `<a href="${msg.image_url}" target="_blank" rel="noopener noreferrer" class="message-image-link"><img src="${msg.image_url}" alt="Imagem da mensagem" class="message-image"></a>` : ''}
                        </div>
                        <div class="message-footer">
                            <small>ID da Mensagem: ${escapeHTML(msg.message_id) || 'N/A'}</small>
                        </div>
                    </li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhuma mensagem recente encontrada para este usuário.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderFullHistoryView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-history"></i> Histórico Detalhado de Alterações (DB)</h3>';
        if (user.history && user.history.length > 0) {
            html += '<ul class="profile-history-log profile-list">';
            user.history.slice().reverse().forEach(entry => { // Mais recentes primeiro
                html += `
                    <li>
                        <strong style="color:#06b6d4;">Alterado em:</strong> ${formatDate(entry.changed_at)}
                        <pre>${escapeHTML(JSON.stringify(entry.changes, null, 2))}</pre>
                    </li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhum histórico de alterações detalhado encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.filter;
            updateActiveFilterButton();
            renderFilteredContent();
        });
    });

    if (searchUserBtn && searchUserIdInput) {
        searchUserBtn.addEventListener('click', () => {
            const userIdToSearch = searchUserIdInput.value.trim();
            if (userIdToSearch) fetchAndDisplayUser(userIdToSearch, 'summary');
        });
        searchUserIdInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const userIdToSearch = searchUserIdInput.value.trim();
                if (userIdToSearch) fetchAndDisplayUser(userIdToSearch, 'summary');
            }
        });
    }
    
    // Chamada inicial para carregar todos os usuários rastreados
    fetchAllTrackedUsers();
    renderFilteredContent(); 
    updateActiveFilterButton(); 
});
