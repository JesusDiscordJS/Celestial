document.addEventListener('DOMContentLoaded', () => {
    // !!!!! ATUALIZE ESTA URL PARA A URL DA SUA API NODE.JS NO RENDER !!!!!
    const API_BASE_URL = 'https://celestial-api.onrender.com'; // Use a sua URL correta da API
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

    // --- DEFINIÇÕES DAS FUNÇÕES AUXILIARES ---
    function showLoading(show = true) {
        if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    function formatDate(dateStringOrObject) {
        if (!dateStringOrObject) return 'N/A';
        let date;
        if (typeof dateStringOrObject === 'object' && dateStringOrObject !== null && '$date' in dateStringOrObject) {
            date = new Date(dateStringOrObject.$date);
        } else {
            date = new Date(dateStringOrObject);
        }
        if (isNaN(date.getTime())) {
            const timestamp = parseInt(dateStringOrObject, 10);
            if (!isNaN(timestamp)) {
                date = new Date(timestamp);
                if (isNaN(date.getTime())) return 'Data Inválida';
            } else {
                return 'Data Inválida';
            }
        }
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // --- DEFINIÇÕES DAS FUNÇÕES PRINCIPAIS DE FETCH E RENDERIZAÇÃO ---
    async function fetchAllUsers(page = 0) {
        showLoading(true);
        const skip = page * usersPerPage;
        try {
            const response = await fetch(`${API_BASE_URL}/users?skip=${skip}&limit=${usersPerPage}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
            }
            const users = await response.json();
            displayUserList(users);
            currentPage = page;
            if (currentPageSpan) currentPageSpan.textContent = `Página: ${currentPage + 1}`;
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            if (userListContainer) userListContainer.innerHTML = `<p class="error-message">Falha ao carregar usuários: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }

    function displayUserList(users) {
        if (!userListContainer) {
            console.error("Elemento userListContainer não encontrado!");
            return;
        }
        userListContainer.innerHTML = '';

        if (!users || users.length === 0) {
            userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Nenhum usuário encontrado nesta página.</p>';
            if (nextPageBtn) nextPageBtn.disabled = (currentPage === 0 || users.length === 0);
            if (prevPageBtn) prevPageBtn.disabled = (currentPage === 0);
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
                if (typeof user.user_id === 'string' || typeof user.user_id === 'number') {
                    userIdDisplayValue = user.user_id.toString();
                    dataUserIdValue = user.user_id.toString();
                } else if (typeof user.user_id === 'object' && user.user_id !== null) {
                    if (user.user_id.$numberLong) {
                        userIdDisplayValue = user.user_id.$numberLong.toString();
                        dataUserIdValue = user.user_id.$numberLong.toString();
                    } else if (typeof user.user_id.toString === 'function' && user.user_id.toString() !== '[object Object]') {
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
                if (serverName && typeof serverName === 'string') {
                    lastServerDisplay = `<span class="info-value">${serverName}</span>`;
                } else {
                    lastServerDisplay = '<span class="info-value placeholder">Nome Indisponível</span>';
                     if (serverName !== undefined && serverName !== null) console.warn("guild_name não é uma string válida ou está ausente:", serverName);
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
                    if (userIdToFetch && userIdToFetch !== 'N/A' && !userIdToFetch.startsWith('[')) {
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
        // Para nicknameCount, vamos contar os nicknames únicos da lista principal, já que o histórico é mais complexo.
        const nicknameCount = user.nicknames ? new Set(user.nicknames.filter(n => n)).size : 0; 
        const serverCount = user.servers ? user.servers.length : 0;
        const historyCount = user.history ? user.history.length : 0;
        
        let userIdForDisplay = 'N/A';
        if (user.user_id) {
            if(typeof user.user_id === 'object' && user.user_id.$numberLong) {
                userIdForDisplay = user.user_id.$numberLong.toString();
            } else if (user.user_id.toString) {
                 userIdForDisplay = user.user_id.toString();
            }
        }

        return `
            <div class="profile-section user-main-info">
                ${latestBanner ? `<div class="profile-banner" style="height:180px; border-radius:12px 12px 0 0; background-image: url('${latestBanner}'); background-size:cover; background-position:center;"></div>` : '<div class="profile-banner-placeholder" style="height:120px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2); border-radius:12px 12px 0 0; color:#888;"><span>Sem Banner Registrado</span></div>'}
                <div style="display:flex; align-items:flex-end; margin-top:-60px; padding:0 25px 25px 25px; position:relative; z-index:1;">
                    <img src="${latestAvatar}" alt="Avatar" style="width:120px; height:120px; border-radius:50%; border:5px solid #18191c; background:#18191c;">
                    <div style="margin-left:20px; padding-bottom:10px;">
                        <h2 style="color:#fff; font-size:2em; margin:0 0 5px 0; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${user.username_global || 'N/A'}</h2>
                        <p style="color:#b9bbbe; font-size:1.1em; margin:0;">ID: ${userIdForDisplay}</p>
                    </div>
                </div>
            </div>
            <div class="profile-section quick-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:20px;">
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-image"></i> Avatares</h3><p style="color:#06b6d4;">${avatarCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-images"></i> Banners</h3><p style="color:#06b6d4;">${bannerCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-signature"></i> Apelidos Únicos</h3><p style="color:#06b6d4;">${nicknameCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-server"></i> Servidores</h3><p style="color:#06b6d4;">${serverCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-history"></i> Registros Hist.</h3><p style="color:#06b6d4;">${historyCount}</p></div>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-info-circle"></i> Informações Gerais (Baseado nos Últimos Dados)</h3>
                <ul class="profile-list">
                    <li><strong>Último apelido conhecido (lista geral):</strong> ${user.nicknames && user.nicknames.length > 0 ? user.nicknames[user.nicknames.length -1] : 'N/A'}</li>
                    <li><strong>Registrado pela primeira vez (no histórico):</strong> ${user.history && user.history.length > 0 ? formatDate(user.history[0].changed_at) : 'N/A'}</li>
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
        html += '<p style="color:#ccc; font-size:0.9em; margin-bottom:15px;">Inclui nomes globais e apelidos de servidor (adicionados à lista geral), ordenados por data de alteração (mais recentes primeiro, quando disponível no histórico).</p>';
        html += '<ul class="profile-list">';
        
        let allNames = [];
        if (user.history && user.history.length > 0) {
            user.history.forEach(entry => {
                if (entry.changes.username_global) {
                    allNames.push({ name: entry.changes.username_global, date: entry.changed_at, type: "Nome Global" });
                }
                if (entry.changes.nickname_added) {
                     allNames.push({ name: entry.changes.nickname_added, date: entry.changed_at, type: "Apelido (do Histórico)" });
                }
            });
        }
        if (user.nicknames && user.nicknames.length > 0) {
            user.nicknames.forEach(nick => {
                if (nick && !allNames.some(n => n.name === nick && n.type === "Apelido (do Histórico)")) { 
                    allNames.push({ name: nick, date: null, type: "Apelido (Lista Geral)" });
                }
            });
        }
        
        allNames.sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            if (dateA !== dateB) return dateB - dateA; // Mais recentes primeiro
            // Se as datas forem iguais (ou ambas nulas), priorize "Nome Global" e "Apelido (do Histórico)"
            if (a.type !== "Apelido (Lista Geral)" && b.type === "Apelido (Lista Geral)") return -1;
            if (a.type === "Apelido (Lista Geral)" && b.type !== "Apelido (Lista Geral)") return 1;
            return 0;
        });

        const uniqueSortedNames = allNames.filter((item, index, self) =>
            index === 0 || item.name !== self[index - 1].name || (item.date && self[index-1].date && formatDate(item.date) !== formatDate(self[index-1].date))
        );


        if (uniqueSortedNames.length > 0) {
            uniqueSortedNames.forEach(nameEntry => {
                html += `<li><strong>${nameEntry.name || 'N/A'}</strong> <small style="color:#8a909a;">(${nameEntry.type}${nameEntry.date ? ' - ' + formatDate(nameEntry.date) : ''})</small></li>`;
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
            const sortedServers = user.servers.slice().sort((a,b) => {
                const dateA = a.first_seen ? new Date(a.first_seen).getTime() : 0;
                const dateB = b.first_seen ? new Date(b.first_seen).getTime() : 0;
                return dateB - dateA; // Mais recente primeiro
            });
            sortedServers.forEach(server => {
                html += `<li><strong>${server.guild_name || 'Nome Desconhecido'}</strong> (ID: ${server.guild_id})<br><small style="color:#8a909a;">Visto pela primeira vez em: ${formatDate(server.first_seen)}</small></li>`;
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
            user.history.slice().reverse().forEach(entry => {
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

    // --- EVENT LISTENERS E CHAMADA INICIAL ---
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

    // Chamadas iniciais ao carregar a página
    fetchAllUsers(0);
    renderFilteredContent(); 
    updateActiveFilterButton(); 
});
