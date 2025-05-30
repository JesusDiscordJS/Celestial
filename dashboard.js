document.addEventListener('DOMContentLoaded', () => {
    // !!!!! ATUALIZE ESTA URL PARA A URL DA SUA API NODE.JS NO RENDER !!!!!
    const API_BASE_URL = 'https://celestial-api.onrender.com'; 
    // Exemplo: 'https://celestial-tracker-api-node.onrender.com'

    // Elementos do DOM
    const userListContainer = document.getElementById('userListContainer');
    const userContentArea = document.getElementById('userContentArea');
    const searchUserIdInput = document.getElementById('searchUserIdInput');
    const searchUserBtn = document.getElementById('searchUserBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const filterButtons = document.querySelectorAll('.dashboard-sidebar .filter-btn');

    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const currentPageSpan = document.getElementById('currentPageSpan');

    let currentPage = 0;
    const usersPerPage = 10; // Ajuste conforme a paginação da sua API
    let currentUserData = null; 
    let currentFilter = 'summary'; 

    function showLoading(show = true) {
        if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none';
    }

function formatDate(dateStringOrObject) {
    if (!dateStringOrObject) return 'N/A';
    let date;
    if (typeof dateStringOrObject === 'object' && dateStringOrObject !== null && '$date' in dateStringOrObject) {
        date = new Date(dateStringOrObject.$date);
    } else {
        date = new Date(dateStringOrObject); // Para strings ISO ou timestamps diretos
    }
    // Verifica se a data é válida após a conversão
    if (isNaN(date.getTime())) {
        // Se a data for inválida, tente interpretar como timestamp (caso o $date não esteja presente e seja apenas o número)
        const timestamp = parseInt(dateStringOrObject, 10);
        if (!isNaN(timestamp)) {
            date = new Date(timestamp);
            // Verifica novamente se é uma data válida após tentar como timestamp
            if (isNaN(date.getTime())) return 'Data Inválida';
        } else {
            return 'Data Inválida'; // Se não for nem objeto $date nem timestamp válido
        }
    }
    return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// SUBSTITUA SUA FUNÇÃO displayUserList POR ESTA:
function displayUserList(users) {
    if (!userListContainer) {
        console.error("Elemento userListContainer não encontrado!");
        return;
    }
    userListContainer.innerHTML = ''; // Limpa a lista anterior

    if (!users || users.length === 0) {
        userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Nenhum usuário encontrado nesta página.</p>';
        if (nextPageBtn) nextPageBtn.disabled = (currentPage === 0 || users.length === 0);
        if (prevPageBtn) prevPageBtn.disabled = (currentPage === 0);
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'user-list'; // Garanta que esta classe exista no seu CSS ou adapte
    users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-list-item-enhanced';

        let userIdDisplayValue = 'N/A';
        let dataUserIdValue = ''; // Para o atributo data-userid

        if (user.user_id) {
            // A API Node.js com res.json() deve converter Long para string se > MAX_SAFE_INTEGER
            // ou para número se <= MAX_SAFE_INTEGER.
            if (typeof user.user_id === 'string' || typeof user.user_id === 'number') {
                userIdDisplayValue = user.user_id.toString();
                dataUserIdValue = user.user_id.toString();
            } else if (typeof user.user_id === 'object' && user.user_id !== null) {
                // Caso a API, por algum motivo, ainda envie um objeto Long BSON ou EJSON
                if (user.user_id.$numberLong) { // Formato EJSON
                    userIdDisplayValue = user.user_id.$numberLong.toString();
                    dataUserIdValue = user.user_id.$numberLong.toString();
                } else if (typeof user.user_id.toString === 'function' && user.user_id.toString() !== '[object Object]') {
                    // Objeto Long BSON que tem um método toString() funcional
                    userIdDisplayValue = user.user_id.toString();
                    dataUserIdValue = user.user_id.toString();
                } else {
                    console.warn("Formato de user_id como objeto não reconhecido:", user.user_id);
                    userIdDisplayValue = '[ID Obj Complexo]';
                }
            } else {
                 console.warn("user_id não é string, número nem objeto esperado:", user.user_id);
                 userIdDisplayValue = '[ID Inválido]';
            }
        }
        
        const latestAvatar = (user.avatar_urls && user.avatar_urls.length > 0) ? user.avatar_urls[user.avatar_urls.length - 1] : 'https://via.placeholder.com/55?text=?';

        let lastServerDisplay = '<span class="info-value placeholder">Nenhum</span>';
        if (user.servers && user.servers.length > 0) {
            const lastServer = user.servers[user.servers.length - 1];
            const serverName = lastServer.guild_name;
            if (serverName && typeof serverName === 'string') { // Checa se serverName é uma string válida
                lastServerDisplay = `<span class="info-value">${serverName}</span>`;
            } else {
                lastServerDisplay = '<span class="info-value placeholder">Nome Indisponível</span>';
                 if (serverName) console.warn("guild_name não é uma string válida:", serverName);
            }
        }

        let lastActivityDateDisplay = '<span class="info-value placeholder">Nenhuma</span>';
        if (user.history && user.history.length > 0) {
            const lastHistoryEntry = user.history[user.history.length - 1];
            lastActivityDateDisplay = `<span class="info-value">${formatDate(lastHistoryEntry.changed_at)}</span>`;
        }

        li.innerHTML = `
            <img src="${latestAvatar}" alt="Avatar de ${user.username_global || 'Usuário'}" class="user-avatar-small">
            <div class="user-info-column">
                <span class="username">${user.username_global || 'Nome Desconhecido'}</span>
                <span class="user-id">ID: ${userIdDisplayValue}</span>
            </div>
            <div class="server-info-column">
                <span class="info-label"><i class="fas fa-server" style="margin-right: 5px;"></i>Último Servidor</span>
                ${lastServerDisplay}
            </div>
            <div class="last-update-column">
                <span class="info-label"><i class="fas fa-history" style="margin-right: 5px;"></i>Última Atividade</span>
                ${lastActivityDateDisplay}
            </div>
            <button class="dashboard-btn view-profile-btn" data-userid="${dataUserIdValue}">
                <i class="fas fa-eye" style="margin-right: 5px;"></i>Ver Perfil
            </button>
        `;

        const viewProfileButton = li.querySelector('.view-profile-btn');
        if (viewProfileButton) {
            viewProfileButton.addEventListener('click', () => {
                const userIdToFetch = viewProfileButton.dataset.userid;
                if (userIdToFetch && userIdToFetch !== 'N/A' && !userIdToFetch.startsWith('[')) { // Verifica se não é um placeholder de erro
                    fetchAndDisplayUser(userIdToFetch, 'summary');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    console.error("ID de usuário inválido ou placeholder de erro para buscar:", userIdToFetch);
                    alert("Não é possível carregar o perfil: ID de usuário inválido.");
                }
            });
        }
        ul.appendChild(li);
    });
    userListContainer.appendChild(ul);
    
    if (prevPageBtn) prevPageBtn.disabled = (currentPage === 0);
    if (nextPageBtn) nextPageBtn.disabled = (users.length < usersPerPage);
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
                    userContentArea.innerHTML = `<p class="error-message">Usuário com ID ${userId} não encontrado.</p>`;
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
            case 'fullHistory': contentHTML = renderFullHistoryView(currentUserData); break;
            default: contentHTML = '<p class="error-message">Filtro desconhecido.</p>';
        }
        userContentArea.innerHTML = contentHTML;
    }

    function renderSummaryView(user) {
        const latestAvatar = (user.avatar_urls && user.avatar_urls.length > 0) ? user.avatar_urls[user.avatar_urls.length - 1] : 'https://via.placeholder.com/128?text=?';
        const latestBanner = (user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls[user.banner_urls.length - 1] : '';
        const avatarCount = user.avatar_urls ? user.avatar_urls.length : 0;
        const bannerCount = user.banner_urls ? user.banner_urls.length : 0;
        const nicknameCount = user.nicknames ? user.nicknames.length : 0;
        const serverCount = user.servers ? user.servers.length : 0;
        const historyCount = user.history ? user.history.length : 0;
        
        return `
            <div class="profile-section user-main-info">
                ${latestBanner ? `<div class="profile-banner" style="height:180px; border-radius:12px 12px 0 0; background-image: url('${latestBanner}'); background-size:cover; background-position:center;"></div>` : '<div class="profile-banner-placeholder" style="height:120px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2); border-radius:12px 12px 0 0; color:#888;"><span>Sem Banner Registrado</span></div>'}
                <div style="display:flex; align-items:flex-end; margin-top:-60px; padding:0 25px 25px 25px; position:relative; z-index:1;">
                    <img src="${latestAvatar}" alt="Avatar" style="width:120px; height:120px; border-radius:50%; border:5px solid #18191c; background:#18191c;">
                    <div style="margin-left:20px; padding-bottom:10px;">
                        <h2 style="color:#fff; font-size:2em; margin:0 0 5px 0; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${user.username_global || 'N/A'}</h2>
                        <p style="color:#b9bbbe; font-size:1.1em; margin:0;">ID: ${user.user_id ? user.user_id.toString() : 'N/A'}</p>
                    </div>
                </div>
            </div>
            <div class="profile-section quick-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:20px;">
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-image"></i> Avatares</h3><p style="color:#06b6d4;">${avatarCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-images"></i> Banners</h3><p style="color:#06b6d4;">${bannerCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-signature"></i> Apelidos</h3><p style="color:#06b6d4;">${nicknameCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-server"></i> Servidores</h3><p style="color:#06b6d4;">${serverCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-history"></i> Registros Hist.</h3><p style="color:#06b6d4;">${historyCount}</p></div>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-info-circle"></i> Informações Gerais (Baseado nos Últimos Dados)</h3>
                <ul class="profile-list">
                    <li><strong>Último apelido conhecido (lista geral):</strong> ${user.nicknames && user.nicknames.length > 0 ? user.nicknames[user.nicknames.length -1] : 'N/A'}</li>
                    <li><strong>Registrado pela primeira vez (rastreado):</strong> ${user.history && user.history.length > 0 ? formatDate(user.history[0].changed_at) : 'N/A'}</li>
                    <li><strong>Última alteração detectada:</strong> ${user.history && user.history.length > 0 ? formatDate(user.history[user.history.length - 1].changed_at) : 'N/A'}</li>
                </ul>
            </div>
        `;
    }

    function renderAvatarsView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-image"></i> Galeria de Avatares</h3>';
        if (user.avatar_urls && user.avatar_urls.length > 0) {
            html += '<div class="avatar-gallery">';
            user.avatar_urls.slice().reverse().forEach(url => {
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
            user.banner_urls.slice().reverse().forEach(url => {
                html += `<img src="${url}" alt="Banner Histórico" class="history-banner" onclick="window.open('${url}', '_blank')" title="Clique para abrir em nova aba">`;
            });
            html += '</div>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhum banner histórico encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderNicknamesView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-signature"></i> Histórico de Nomes de Usuário/Apelidos</h3>';
        html += '<p style="color:#ccc; font-size:0.9em; margin-bottom:15px;">Inclui nomes globais e apelidos de servidor (adicionados à lista geral), ordenados por data de alteração (mais recentes primeiro, quando disponível no histórico).</p>'
        html += '<ul class="profile-list">';
        
        let allNames = [];
        if (user.history && user.history.length > 0) {
            user.history.forEach(entry => {
                if (entry.changes.username_global) {
                    allNames.push({ name: entry.changes.username_global, date: entry.changed_at, type: "Nome Global" });
                }
                if (entry.changes.nickname_added) { // 'nickname_added' é o que usamos no script do bot
                     allNames.push({ name: entry.changes.nickname_added, date: entry.changed_at, type: "Apelido (do Histórico)" });
                }
            });
        }
        // Adiciona a lista principal de nicknames se eles não estiverem já no histórico (pode haver redundância)
        if (user.nicknames && user.nicknames.length > 0) {
            user.nicknames.forEach(nick => {
                // Verifica se um apelido similar já foi adicionado do histórico para evitar mostrar exatamente o mesmo dado duas vezes se a data for a mesma
                // Esta lógica de desduplicação pode ser aprimorada
                if (!allNames.some(n => n.name === nick && n.type === "Apelido (do Histórico)")) { 
                    allNames.push({ name: nick, date: null, type: "Apelido (Lista Geral)" });
                }
            });
        }
        
        allNames.sort((a, b) => {
            if (a.date && b.date) return new Date(b.date).getTime() - new Date(a.date).getTime();
            if (a.date) return -1; // Coloca itens com data primeiro
            if (b.date) return 1;  // Coloca itens com data primeiro
            return 0; // Mantém a ordem para itens sem data
        });

        const uniqueSortedNames = allNames.filter((item, index, self) =>
            index === 0 || item.name !== self[index - 1].name // Remove duplicados consecutivos simples (pode ser melhorado)
        );

        if (uniqueSortedNames.length > 0) {
            uniqueSortedNames.forEach(nameEntry => {
                html += `<li><strong>${nameEntry.name || 'N/A'}</strong> <small style="color:#888;">(${nameEntry.type}${nameEntry.date ? ' - ' + formatDate(nameEntry.date) : ''})</small></li>`;
            });
        } else {
            html += '<li>Nenhum nome/apelido histórico encontrado.</li>';
        }
        html += '</ul></div>';
        return html;
    }

    function renderServersView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-server"></i> Servidores Encontrados</h3>';
        if (user.servers && user.servers.length > 0) {
            html += '<ul class="profile-list">';
            // Ordenar por data de "first_seen", mais recente primeiro, se essa data for confiável
            const sortedServers = user.servers.slice().sort((a,b) => new Date(b.first_seen).getTime() - new Date(a.first_seen).getTime());
            sortedServers.forEach(server => {
                html += `<li><strong>${server.guild_name || 'Nome Desconhecido'}</strong> (ID: ${server.guild_id})<br><small style="color:#888;">Visto pela primeira vez em: ${formatDate(server.first_seen)}</small></li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhum servidor registrado para este usuário.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderFullHistoryView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-history"></i> Histórico Completo de Alterações</h3>';
        if (user.history && user.history.length > 0) {
            html += '<ul class="profile-history-log profile-list">';
            user.history.slice().reverse().forEach(entry => { // Mais recentes primeiro
                html += `
                    <li>
                        <strong style="color:#06b6d4;">Alterado em:</strong> ${formatDate(entry.changed_at)}
                        <pre>${JSON.stringify(entry.changes, null, 2)}</pre>
                    </li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text" style="font-size:1em;">Nenhum histórico de alterações detalhado encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    // Event Listeners Iniciais
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

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 0) fetchAllUsers(currentPage - 1);
        });
    }
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => fetchAllUsers(currentPage + 1));
    }

    fetchAllUsers(0);
    renderFilteredContent(); 
    updateActiveFilterButton(); 
});
