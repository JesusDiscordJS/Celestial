document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://celestial-api.onrender.com'; // ATUALIZE COM SUA URL DA API NODE.JS

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
    const usersPerPage = 10;
    let currentUserData = null; // Armazena os dados do usuário selecionado/pesquisado
    let currentFilter = 'summary'; // Filtro ativo inicialmente

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
        return date.toLocaleString('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
    }

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
            if (prevPageBtn) prevPageBtn.disabled = (currentPage === 0);
            if (nextPageBtn) nextPageBtn.disabled = (users.length < usersPerPage);
        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            if (userListContainer) userListContainer.innerHTML = `<p class="error-message">Falha ao carregar usuários: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }

    function displayUserList(users) {
        if (!userListContainer) return;
        userListContainer.innerHTML = '';
        if (!users || users.length === 0) {
            userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Nenhum usuário encontrado nesta página.</p>';
            if (nextPageBtn && currentPage > 0) nextPageBtn.disabled = true; // Desabilita se não houver mais usuários e não for a primeira página
            else if (nextPageBtn && currentPage === 0) nextPageBtn.disabled = true; // Também desabilita se não houver usuários na primeira página.
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'user-list'; // Adapte a classe CSS se necessário
        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'user-list-item'; // Adapte a classe CSS
            const latestAvatar = (user.avatar_urls && user.avatar_urls.length > 0) ? user.avatar_urls[user.avatar_urls.length - 1] : 'https://via.placeholder.com/40?text=?';
            li.innerHTML = `
                <img src="${latestAvatar}" alt="Avatar" class="user-avatar-small" style="width:40px; height:40px; border-radius:50%; margin-right:10px;">
                <span>${user.username_global || 'N/A'} (ID: ${user.user_id})</span>
                <button class="dashboard-btn" data-userid="${user.user_id}" style="margin-left:auto; padding: 5px 10px; font-size:0.8em;">Ver Perfil</button>
            `;
            li.querySelector('button').addEventListener('click', () => {
                fetchAndDisplayUser(user.user_id, 'summary');
                 window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo da página
            });
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
        currentUserData = null; // Limpa dados anteriores
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
            if (btn.dataset.filter === currentFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function renderFilteredContent() {
        if (!userContentArea) return;
        userContentArea.innerHTML = ''; // Limpa antes de renderizar

        if (!currentUserData) {
            userContentArea.innerHTML = `<p class="placeholder-text">
                <i class="fas fa-user-slash" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i>
                Nenhum usuário selecionado. <br> Pesquise por um ID ou selecione da lista.
            </p>`;
            return;
        }

        let contentHTML = '';
        switch (currentFilter) {
            case 'summary':
                contentHTML = renderSummaryView(currentUserData);
                break;
            case 'avatars':
                contentHTML = renderAvatarsView(currentUserData);
                break;
            case 'banners':
                contentHTML = renderBannersView(currentUserData);
                break;
            case 'nicknames':
                contentHTML = renderNicknamesView(currentUserData);
                break;
            case 'servers':
                contentHTML = renderServersView(currentUserData);
                break;
            case 'fullHistory':
                contentHTML = renderFullHistoryView(currentUserData);
                break;
            default:
                contentHTML = '<p class="error-message">Filtro desconhecido.</p>';
        }
        userContentArea.innerHTML = contentHTML;
    }

    // --- Funções de Renderização para cada Filtro ---

    function renderSummaryView(user) {
        const latestAvatar = (user.avatar_urls && user.avatar_urls.length > 0) ? user.avatar_urls[user.avatar_urls.length - 1] : 'https://via.placeholder.com/128?text=?';
        const latestBanner = (user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls[user.banner_urls.length - 1] : '';

        // Contagem de itens para o resumo
        const avatarCount = user.avatar_urls ? user.avatar_urls.length : 0;
        const bannerCount = user.banner_urls ? user.banner_urls.length : 0;
        const nicknameCount = user.nicknames ? user.nicknames.length : 0;
        const serverCount = user.servers ? user.servers.length : 0;
        const historyCount = user.history ? user.history.length : 0;
        
        return `
            <div class="profile-section user-main-info">
                ${latestBanner ? `<div class="profile-banner" style="height:150px; border-radius:8px 8px 0 0; background-image: url('${latestBanner}'); background-size:cover; background-position:center;"></div>` : '<div class="profile-banner-placeholder" style="height:100px; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.2); border-radius:8px 8px 0 0;"><span>Sem Banner</span></div>'}
                <div style="display:flex; align-items:flex-end; margin-top:-50px; padding:0 20px 20px 20px; position:relative; z-index:1;">
                    <img src="${latestAvatar}" alt="Avatar" style="width:100px; height:100px; border-radius:50%; border:4px solid #0f0820; background:#0f0820;">
                    <div style="margin-left:15px;">
                        <h2 style="color:#fff; font-size:1.8em; margin:0 0 5px 0;">${user.username_global || 'N/A'}</h2>
                        <p style="color:#ccc; font-size:1em; margin:0;">ID: ${user.user_id}</p>
                    </div>
                </div>
            </div>
            <div class="profile-section quick-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:15px;">
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-image"></i> Avatares</h3><p>${avatarCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-images"></i> Banners</h3><p>${bannerCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-signature"></i> Apelidos</h3><p>${nicknameCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-server"></i> Servidores</h3><p>${serverCount}</p></div>
                <div class="widget" style="text-align:center;"><h3><i class="fas fa-history"></i> Registros</h3><p>${historyCount}</p></div>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-info-circle"></i> Sobre (Último Registro)</h3>
                <p><strong>Último apelido conhecido:</strong> ${user.nicknames && user.nicknames.length > 0 ? user.nicknames[user.nicknames.length -1] : 'N/A'}</p>
                <p><strong>Registrado pela primeira vez em um servidor (rastreado):</strong> ${user.servers && user.servers.length > 0 ? `${user.servers[0].guild_name} em ${formatDate(user.servers[0].first_seen)}` : 'N/A'}</p>
                <p><strong>Última alteração detectada:</strong> ${user.history && user.history.length > 0 ? formatDate(user.history[user.history.length - 1].changed_at) : 'N/A'}</p>
            </div>
        `;
    }

    function renderAvatarsView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-image"></i> Galeria de Avatares</h3>';
        if (user.avatar_urls && user.avatar_urls.length > 0) {
            html += '<div class="avatar-gallery">';
            // Mostra do mais recente para o mais antigo
            user.avatar_urls.slice().reverse().forEach(url => {
                html += `<img src="${url}" alt="Avatar Histórico" class="history-avatar" onclick="window.open('${url}', '_blank')">`;
            });
            html += '</div>';
        } else {
            html += '<p>Nenhum avatar histórico encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderBannersView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-images"></i> Galeria de Banners</h3>';
        if (user.banner_urls && user.banner_urls.length > 0) {
            html += '<div class="banner-gallery">';
            user.banner_urls.slice().reverse().forEach(url => {
                html += `<img src="${url}" alt="Banner Histórico" class="history-banner" onclick="window.open('${url}', '_blank')">`;
            });
            html += '</div>';
        } else {
            html += '<p>Nenhum banner histórico encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderNicknamesView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-signature"></i> Histórico de Nomes de Usuário/Apelidos</h3>';
        html += '<p style="color:#ccc; font-size:0.9em; margin-bottom:15px;">Inclui nomes globais e apelidos de servidor, ordenados do mais recente (se disponível no histórico) para o mais antigo.</p>'
        html += '<ul class="profile-list">';
        
        // Coletar e ordenar todos os nomes e apelidos do histórico
        let allNames = [];
        if (user.history && user.history.length > 0) {
            user.history.forEach(entry => {
                if (entry.changes.username_global) {
                    allNames.push({ name: entry.changes.username_global, date: entry.changed_at, type: "Nome Global" });
                }
                if (entry.changes.nickname_added) {
                     allNames.push({ name: entry.changes.nickname_added, date: entry.changed_at, type: "Apelido Adicionado" });
                }
            });
        }
        // Adicionar a lista principal de nicknames se não estiverem já no histórico (pode haver redundância, mas garante que todos apareçam)
        if (user.nicknames && user.nicknames.length > 0) {
            user.nicknames.forEach(nick => {
                if (!allNames.some(n => n.name === nick && n.type === "Apelido Adicionado")) { // Evita duplicados simples
                    allNames.push({ name: nick, date: null, type: "Apelido (Lista Geral)" });
                }
            });
        }
        // Ordenar por data (os sem data específica ficam no final ou início, dependendo da lógica de sort)
        allNames.sort((a, b) => {
            if (a.date && b.date) return new Date(b.date) - new Date(a.date); // Mais recentes primeiro
            if (a.date) return -1;
            if (b.date) return 1;
            return 0;
        });

        // Remover duplicados consecutivos após ordenação (mantendo o mais recente)
        const uniqueSortedNames = allNames.filter((item, index, self) =>
            index === 0 || item.name !== self[index - 1].name || item.type !== self[index - 1].type
        );


        if (uniqueSortedNames.length > 0) {
            uniqueSortedNames.forEach(nameEntry => {
                html += `<li><strong>${nameEntry.name}</strong> <small>(${nameEntry.type}${nameEntry.date ? ' - ' + formatDate(nameEntry.date) : ''})</small></li>`;
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
            user.servers.forEach(server => {
                html += `<li><strong>${server.guild_name}</strong> (ID: ${server.guild_id})<br><small>Visto pela primeira vez em: ${formatDate(server.first_seen)}</small></li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>Nenhum servidor registrado para este usuário.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderFullHistoryView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-history"></i> Histórico Completo de Alterações</h3>';
        if (user.history && user.history.length > 0) {
            html += '<ul class="profile-history-log profile-list">'; // Reutiliza .profile-list para consistência
            // Mostra do mais recente para o mais antigo
            user.history.slice().reverse().forEach(entry => {
                html += `
                    <li>
                        <strong>Alterado em:</strong> ${formatDate(entry.changed_at)}
                        <pre>${JSON.stringify(entry.changes, null, 2)}</pre>
                    </li>`;
            });
            html += '</ul>';
        } else {
            html += '<p>Nenhum histórico de alterações detalhado encontrado.</p>';
        }
        html += '</div>';
        return html;
    }

    // Event Listeners
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

    // Carrega a lista inicial de usuários e o estado inicial da UI
    fetchAllUsers(0);
    renderFilteredContent(); // Mostra o placeholder inicial
    updateActiveFilterButton(); // Define o botão 'summary' como ativo
});
