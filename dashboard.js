document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://celestial-api.onrender.com'; // Ou seu endpoint local

    const userListContainer = document.getElementById('userListContainer');
    const userContentArea = document.getElementById('userContentArea');
    const searchUserIdInput = document.getElementById('searchUserIdInput');
    const searchUserBtn = document.getElementById('searchUserBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const filterButtons = document.querySelectorAll('.dashboard-sidebar .filter-btn');
    const paginationControlsDiv = document.querySelector('.pagination-controls');

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

    function formatDate(dateSource) {
        if (!dateSource) return 'N/A';
        let date;

        if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) { // Legado EJSON
            const dateValue = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date;
            date = new Date(dateValue);
        } else if (typeof dateSource === 'number') { // Timestamp
            date = new Date(dateSource);
        } else if (typeof dateSource === 'string') { // String ISO ou timestamp
            if (dateSource.includes('-') || dateSource.includes(':') || dateSource.includes('T') || dateSource.includes('Z')) {
                date = new Date(dateSource);
            } else {
                const parsedTimestamp = parseInt(dateSource, 10);
                if (!isNaN(parsedTimestamp) && parsedTimestamp.toString().length === dateSource.length) {
                    date = new Date(parsedTimestamp);
                } else {
                    date = new Date(dateSource); // Última tentativa de parse
                }
            }
        } else {
            return 'Formato Desconhecido';
        }

        if (!date || isNaN(date.getTime()) || date.getTime() <= 0) {
            if (typeof dateSource === 'string') { // Tenta mais uma vez se for string
                let lastAttemptDate = new Date(dateSource);
                if (lastAttemptDate && !isNaN(lastAttemptDate.getTime()) && lastAttemptDate.getTime() > 0) {
                    date = lastAttemptDate;
                } else {
                     return `Data Inválida [${typeof dateSource}: ${dateSource.toString().substring(0,50)}]`;
                }
            } else {
                 return `Data Inválida [${typeof dateSource}]`;
            }
        }
        return date.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    function formatDateForSort(dateSource) {
        if (!dateSource) return 0;
        if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) {
            const potentialTimestamp = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date;
            if (typeof potentialTimestamp === 'number') return potentialTimestamp;
            const d = new Date(potentialTimestamp);
            return !isNaN(d.getTime()) ? d.getTime() : 0;
        }
        if (typeof dateSource === 'number') {
            return dateSource;
        }
        if (typeof dateSource === 'string') {
            const d = new Date(dateSource);
            if (!isNaN(d.getTime()) && d.getTime() > 0) return d.getTime();
            const n = parseInt(dateSource, 10);
            if (!isNaN(n) && n.toString().length === dateSource.length) return n;
        }
        return 0;
    }

    async function fetchAllTrackedUsers() {
        showLoading(true);
        if (paginationControlsDiv) paginationControlsDiv.style.display = 'none';
        try {
            const response = await fetch(`${API_BASE_URL}/users`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
            }
            const users = await response.json();
            users.sort((a, b) => formatDateForSort(b.last_seen_overall_at) - formatDateForSort(a.last_seen_overall_at));
            displayUserList(users);
        } catch (error) {
            console.error('Erro ao buscar todos os usuários:', error);
            if (userListContainer) userListContainer.innerHTML = `<p class="error-message">Falha ao carregar usuários: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    function displayUserList(users) {
        if (!userListContainer) { console.error("Elemento userListContainer não encontrado!"); return; }
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
            let userIdDisplayValue = user.user_id ? user.user_id.toString() : 'N/A';
            const latestAvatar = (user.current_avatar_url || (user.avatar_url_history && user.avatar_url_history.length > 0 ? user.avatar_url_history[user.avatar_url_history.length - 1] : null)) || 'https://via.placeholder.com/55?text=?';
            const currentUsername = user.current_username_global || user.username_global_history?.slice(-1)[0] || 'Nome Desconhecido';

            let lastServerDisplay = '<span class="info-value placeholder">Nenhum</span>';
            if (user.servers && user.servers.length > 0) {
                const lastServer = user.servers.slice().sort((a,b) => formatDateForSort(b.last_message_at || b.first_message_at) - formatDateForSort(a.last_message_at || a.first_message_at))[0];
                lastServerDisplay = `<span class="info-value">${escapeHTML(lastServer.guild_name || 'Nome Indisponível')}</span>`;
            }
            let lastActivityDateDisplay = '<span class="info-value placeholder">Nenhuma</span>';
            if (user.last_seen_overall_at) {
                lastActivityDateDisplay = `<span class="info-value">${formatDate(user.last_seen_overall_at)}</span>`;
            } else if (user.recent_messages && user.recent_messages.length > 0) {
                const lastMessageTimestamp = user.recent_messages.slice().sort((a,b) => formatDateForSort(b.timestamp) - formatDateForSort(a.timestamp))[0].timestamp;
                lastActivityDateDisplay = `<span class="info-value">${formatDate(lastMessageTimestamp)}</span>`;
            }
            li.innerHTML = `
                <img src="${latestAvatar}" alt="Avatar de ${escapeHTML(currentUsername)}" class="user-avatar-small">
                <div class="user-info-column">
                    <span class="username">${escapeHTML(currentUsername)}</span>
                    <span class="user-id">ID: ${escapeHTML(userIdDisplayValue)}</span>
                </div>
                <div class="server-info-column">
                    <span class="info-label"><i class="fas fa-server"></i>Último Servidor Ativo</span>
                    ${lastServerDisplay}
                </div>
                <div class="last-update-column">
                    <span class="info-label"><i class="fas fa-history"></i>Última Atividade</span>
                    ${lastActivityDateDisplay}
                </div>
                <button class="dashboard-btn view-profile-btn" data-userid="${escapeHTML(userIdDisplayValue)}">
                    <i class="fas fa-eye"></i>Ver Perfil
                </button>`;
            const viewProfileButton = li.querySelector('.view-profile-btn');
            if (viewProfileButton) {
                viewProfileButton.addEventListener('click', () => {
                    const userIdToFetch = viewProfileButton.dataset.userid;
                    if (userIdToFetch && userIdToFetch !== 'N/A' && !userIdToFetch.startsWith('[')) {
                        fetchAndDisplayUser(userIdToFetch, 'summary');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else {
                        alert("ID de usuário inválido.");
                    }
                });
            }
            ul.appendChild(li);
        });
        userListContainer.appendChild(ul);
    }

    async function fetchAndDisplayUser(userId, filterToShow = 'summary') {
        if (!userId) { userContentArea.innerHTML = '<p class="error-message">ID de usuário inválido.</p>'; return; }
        showLoading(true);
        currentUserData = null;
        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: response.statusText }));
                userContentArea.innerHTML = `<p class="error-message">Usuário com ID ${escapeHTML(userId)} não encontrado (HTTP ${response.status}: ${errorData.error || response.statusText}).</p>`;
                return;
            }
            currentUserData = await response.json();
            currentFilter = filterToShow;
            updateActiveFilterButton();
            renderFilteredContent();
        } catch (error) {
            console.error(`Erro ao buscar detalhes do usuário ${userId}:`, error);
            userContentArea.innerHTML = `<p class="error-message">Falha ao carregar detalhes: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    function updateActiveFilterButton() {
        filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
    }

    function renderFilteredContent() {
        if (!userContentArea) return;
        userContentArea.innerHTML = ''; 
        if (!currentUserData) {
            userContentArea.innerHTML = `<p class="placeholder-text"><i class="fas fa-user-slash"></i> Nenhum usuário selecionado.</p>`;
            return;
        }
        let contentHTML = '';
        switch (currentFilter) {
            case 'summary': contentHTML = renderSummaryView(currentUserData); break;
            case 'avatars': contentHTML = renderAvatarsView(currentUserData); break;
            case 'banners': contentHTML = renderBannersView(currentUserData); break;
            case 'message_images_gallery': contentHTML = renderMessageImagesGalleryView(currentUserData); break;
            case 'nicknames': contentHTML = renderNicknamesView(currentUserData); break;
            case 'servers': contentHTML = renderServersView(currentUserData); break;
            case 'messages': contentHTML = renderMessagesView(currentUserData); break;
            case 'fullHistory': contentHTML = renderFullHistoryView(currentUserData); break;
            default: contentHTML = '<p class="error-message">Filtro desconhecido.</p>';
        }
        userContentArea.innerHTML = contentHTML;
    }

    function renderSummaryView(user) {
        const latestAvatar = user.current_avatar_url || (user.avatar_url_history && user.avatar_url_history.length > 0 ? user.avatar_url_history[user.avatar_url_history.length - 1] : 'https://via.placeholder.com/128?text=?');
        const latestBanner = (user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls[user.banner_urls.length - 1] : '';
        const avatarCount = user.avatar_url_history ? user.avatar_url_history.length : 0;
        const bannerCount = user.banner_urls ? user.banner_urls.length : 0;
        const messageImageCount = user.message_image_history ? user.message_image_history.length : 0; // Contagem do novo histórico
        const nicknameCount = user.username_global_history ? new Set(user.username_global_history.filter(n => n)).size : 0;  
        const serverCount = user.servers ? user.servers.length : 0;
        const historyLogCount = user.history ? user.history.length : 0; // Renomeado para clareza
        const recentMessageCount = user.recent_messages ? user.recent_messages.length : 0;
        
        let userIdForDisplay = user.user_id ? user.user_id.toString() : 'N/A';
        const currentUsername = user.current_username_global || user.username_global_history?.slice(-1)[0] || 'N/A';

        return `
            <div class="profile-section user-main-info">
                ${latestBanner ? `<div class="profile-banner" style="background-image: url('${escapeHTML(latestBanner)}');"></div>` : '<div class="profile-banner-placeholder"><span>Sem Banner</span></div>'}
                <div class="profile-header-content">
                    <img src="${escapeHTML(latestAvatar)}" alt="Avatar" class="profile-avatar-large">
                    <div class="profile-name-id">
                        <h2>${escapeHTML(currentUsername)}</h2>
                        <p>ID: ${escapeHTML(userIdForDisplay)}</p>
                    </div>
                </div>
            </div>
            <div class="profile-section quick-stats">
                <div class="widget"><h3><i class="fas fa-user-edit"></i> Nomes Globais</h3><p>${nicknameCount}</p></div>
                <div class="widget"><h3><i class="fas fa-image"></i> Avatares</h3><p>${avatarCount}</p></div>
                <div class="widget"><h3><i class="fas fa-images"></i> Banners</h3><p>${bannerCount}</p></div>
                <div class="widget"><h3><i class="fas fa-server"></i> Servidores</h3><p>${serverCount}</p></div>
                <div class="widget"><h3><i class="fas fa-comment-alt-image"></i> Imgs. Mensagem</h3><p>${messageImageCount}</p></div>
                <div class="widget"><h3><i class="fas fa-comments"></i> Msgs. Recentes</h3><p>${recentMessageCount}</p></div>
                <div class="widget"><h3><i class="fas fa-history"></i> Logs Hist.</h3><p>${historyLogCount}</p></div>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-info-circle"></i> Informações Gerais</h3>
                <ul class="profile-list">
                    <li><strong>Primeira vez Visto:</strong> ${formatDate(user.first_seen_overall_at)}</li>
                    <li><strong>Última Atividade:</strong> ${formatDate(user.last_seen_overall_at)}</li>
                </ul>
            </div>`;
    } // Adaptei o HTML do summary para um visual mais comum.

    function renderAvatarsView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-image"></i> Galeria de Avatares</h3>';
        if (user.avatar_url_history && user.avatar_url_history.length > 0) {
            html += '<div class="avatar-gallery">'; // Usando a classe da galeria de avatares
            user.avatar_url_history.slice().reverse().forEach(url => {
                html += `<img src="${escapeHTML(url)}" alt="Avatar Histórico" class="history-avatar" onclick="window.open('${escapeHTML(url)}', '_blank')" title="Clique para abrir em nova aba">`;
            });
            html += '</div>';
        } else {
            html += '<p class="placeholder-text">Nenhum avatar histórico.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderBannersView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-images"></i> Galeria de Banners</h3>';
        if (user.banner_urls && user.banner_urls.length > 0) {
            html += '<div class="banner-gallery">'; // Similar à galeria de avatares, pode usar CSS parecido
            user.banner_urls.slice().reverse().forEach(url => {
                // Adaptei para usar uma classe similar a 'history-avatar' para consistência,
                // mas com nome diferente se precisar de estilo específico.
                html += `<img src="${escapeHTML(url)}" alt="Banner Histórico" class="history-banner-item" onclick="window.open('${escapeHTML(url)}', '_blank')" title="Clique para abrir em nova aba">`;
            });
            html += '</div>';
        } else {
            html += '<p class="placeholder-text">Nenhum banner histórico.</p>';
        }
        html += '</div>';
        return html;
    }

    // FUNÇÃO ATUALIZADA PARA GALERIA DE IMAGENS DE MENSAGENS (ILIMITADA E ESTILO AVATAR)
    function renderMessageImagesGalleryView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-comment-alt-image"></i> Galeria de Imagens das Mensagens (Todas)</h3>';
        
        const allMessageImages = user.message_image_history || [];

        if (allMessageImages.length > 0) {
            const sortedImages = [...allMessageImages].sort((a, b) => 
                formatDateForSort(b.timestamp) - formatDateForSort(a.timestamp) // Mais recentes primeiro
            );

            html += '<div class="avatar-gallery">'; // REUTILIZANDO a classe .avatar-gallery para o layout
            sortedImages.forEach(imgData => {
                const titleText = `Servidor: ${escapeHTML(imgData.guild_name || 'N/A')}\nData: ${formatDate(imgData.timestamp)}\nID Mensagem: ${escapeHTML(imgData.message_id || 'N/A')}${imgData.content_snippet ? `\nTexto: ${escapeHTML(imgData.content_snippet)}` : ''}`;
                html += `<img src="${escapeHTML(imgData.url)}" 
                              alt="Imagem da Mensagem (ID: ${escapeHTML(imgData.message_id || 'N/A')})" 
                              class="history-avatar"  // REUTILIZANDO a classe .history-avatar para o estilo
                              onclick="window.open('${escapeHTML(imgData.url)}', '_blank')" 
                              title="${escapeHTML(titleText)}">`;
            });
            html += '</div>';
        } else {
            html += '<p class="placeholder-text">Nenhuma imagem de mensagem encontrada no histórico.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderNicknamesView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-signature"></i> Histórico de Nomes Globais</h3>';
        if (user.username_global_history && user.username_global_history.length > 0) {
            html += '<ul class="profile-list">';
            const uniqueNames = [...new Set(user.username_global_history)].reverse();
            uniqueNames.forEach(name => {
                html += `<li><strong>${escapeHTML(name) || 'N/A'}</strong></li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text">Nenhum nome global histórico.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderServersView(user) {
        let html = '<div class="profile-section"><h3><i class="fas fa-server"></i> Servidores Encontrados</h3>';
        if (user.servers && user.servers.length > 0) {
            html += '<ul class="profile-list">';
            const sortedServers = user.servers.slice().sort((a,b) => formatDateForSort(b.last_message_at || b.first_message_at) - formatDateForSort(a.last_message_at || a.first_message_at));
            sortedServers.forEach(server => {
                html += `<li><strong>${escapeHTML(server.guild_name) || 'Nome Desconhecido'}</strong> (ID: ${escapeHTML(server.guild_id)})
                            <br><small>Primeira msg: ${formatDate(server.first_message_at)}</small>
                            <br><small>Última msg: ${formatDate(server.last_message_at)}</small></li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text">Nenhum servidor registrado.</p>';
        }
        html += '</div>';
        return html;
    }

    function renderMessagesView(user) { // Mostra as 10 mensagens recentes (com suas imagens inline)
        let html = '<div class="profile-section"><h3><i class="fas fa-comments"></i> Mensagens Recentes (Últimas 10)</h3>';
        if (user.recent_messages && user.recent_messages.length > 0) {
            html += '<ul class="profile-list messages-list">';
            user.recent_messages.slice().reverse().forEach(msg => {
                html += `
                    <li class="message-item">
                        <div class="message-header">
                            <strong>${escapeHTML(msg.guild_name) || 'Servidor Desconhecido'}</strong>
                            <span class="message-timestamp">${formatDate(msg.timestamp)}</span>
                        </div>
                        <div class="message-content">
                            ${msg.content ? `<p class="message-text">${escapeHTML(msg.content)}</p>` : '<p class="message-text placeholder-text"><em>(Sem texto)</em></p>'}
                            ${msg.image_url ? `<a href="${msg.image_url}" target="_blank" rel="noopener noreferrer" class="message-image-link"><img src="${msg.image_url}" alt="Imagem" class="message-image"></a>` : ''}
                        </div>
                        <div class="message-footer"><small>ID Msg: ${escapeHTML(msg.message_id) || 'N/A'}</small></div>
                    </li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text">Nenhuma mensagem recente.</p>';
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
                        <strong>Alterado em:</strong> ${formatDate(entry.changed_at)}
                        <pre>${escapeHTML(JSON.stringify(entry.changes, null, 2))}</pre>
                    </li>`;
            });
            html += '</ul>';
        } else {
            html += '<p class="placeholder-text">Nenhum histórico de alterações.</p>';
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
        const performSearch = () => {
            const userIdToSearch = searchUserIdInput.value.trim();
            if (userIdToSearch) fetchAndDisplayUser(userIdToSearch, 'summary');
        };
        searchUserBtn.addEventListener('click', performSearch);
        searchUserIdInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') performSearch();
        });
    }
    
    fetchAllTrackedUsers(); // Carrega lista de usuários ao iniciar
    renderFilteredContent(); // Renderiza placeholder inicial ou usuário se houver dados
    updateActiveFilterButton(); 
});
