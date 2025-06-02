// dashboard.js (Completo e Atualizado com Logs de Depuração)
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://celestial-api.onrender.com'; // Certifique-se que está correto

    const LOG_PREFIX = "[AuthDebug] ";

    // Elementos do Header
    const userProfileArea = document.getElementById('userProfileArea');
    const dashboardLoginBtn = document.getElementById('dashboardLoginBtn'); // Botão de login no header do dashboard
    const userInfoDisplay = document.getElementById('userInfoDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const userRoleDisplay = document.getElementById('userRoleDisplay');
    const logoutButtonHeader = document.getElementById('logoutButtonHeader');
    const adminPanelBtn = document.getElementById('adminPanelBtn');

    // Elementos do Conteúdo Principal
    const userListContainer = document.getElementById('userListContainer');
    const userContentArea = document.getElementById('userContentArea');
    const searchUserIdInput = document.getElementById('searchUserIdInput');
    const searchUserBtn = document.getElementById('searchUserBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const filterButtons = document.querySelectorAll('.dashboard-sidebar .filter-btn:not(#adminPanelBtn)');
    const paginationControlsDiv = document.querySelector('.pagination-controls');
    
    const loginPrompt = document.getElementById('loginPrompt'); // Span no placeholder
    const loggedInContentPlaceholder = document.getElementById('loggedInContentPlaceholder'); // Span no placeholder
    const inlineLoginLink = document.getElementById('inlineLoginLink'); // Link no placeholder


    let currentUserData = null;
    let currentFilter = 'summary';
    let loggedInUserInfo = null;

    function getToken() {
        return localStorage.getItem('appToken');
    }

    function storeToken(token) {
        localStorage.setItem('appToken', token);
    }

    function clearToken() {
        console.log(LOG_PREFIX + "Limpando token do localStorage.");
        localStorage.removeItem('appToken');
    }

    function updateHeaderUI(userData) {
        console.log(LOG_PREFIX + "Atualizando UI do Header com dados:", userData);
        if (userData && userData.username) {
            if(userAvatar) userAvatar.src = userData.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`;
            if(usernameDisplay) usernameDisplay.textContent = userData.username;
            if(userRoleDisplay) {
                userRoleDisplay.textContent = userData.role;
                userRoleDisplay.className = 'user-role-display'; // Classe base
                userRoleDisplay.classList.add('role-' + userData.role.toLowerCase());
            }

            if(userInfoDisplay) userInfoDisplay.style.display = 'flex';
            if(dashboardLoginBtn) dashboardLoginBtn.style.display = 'none';
            if(logoutButtonHeader) logoutButtonHeader.style.display = 'inline-block';

            if (adminPanelBtn && userData.role === 'admin') {
                adminPanelBtn.style.display = 'block';
            } else if (adminPanelBtn) {
                adminPanelBtn.style.display = 'none';
            }
             if(loginPrompt) loginPrompt.style.display = 'none';
            if(loggedInContentPlaceholder) loggedInContentPlaceholder.style.display = 'inline';

        } else {
            console.log(LOG_PREFIX + "Nenhum dado de usuário para UI do header, configurando UI de deslogado.");
            setLoggedOutUI();
        }
    }

    function setLoggedOutUI() {
        console.log(LOG_PREFIX + "Configurando UI para estado deslogado.");
        if(userInfoDisplay) userInfoDisplay.style.display = 'none';
        if(logoutButtonHeader) logoutButtonHeader.style.display = 'none';
        if(dashboardLoginBtn) dashboardLoginBtn.style.display = 'flex';
        if(adminPanelBtn) adminPanelBtn.style.display = 'none';

        currentUserData = null;
        loggedInUserInfo = null;
        if (userContentArea) {
             userContentArea.innerHTML = `<p class="placeholder-text">
                <i class="fas fa-info-circle" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i>
                Bem-vindo ao Dashboard! <br>
                <span id="loginPromptContent">Por favor, <a href="#" id="mainContentLoginLink">faça login com Discord</a> para acessar os dados.</span>
            </p>`;
            const mainContentLoginLink = document.getElementById('mainContentLoginLink');
            // Garante que dashboardLoginBtn exista antes de adicionar evento
            if(mainContentLoginLink && dashboardLoginBtn) {
                mainContentLoginLink.onclick = (e) => { e.preventDefault(); dashboardLoginBtn.click(); };
            } else if (mainContentLoginLink) { // Fallback se dashboardLoginBtn não estiver pronto
                mainContentLoginLink.href = `${API_BASE_URL}/auth/discord`;
            }
        }
        if(userListContainer) userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Faça login para ver os usuários.</p>';
        
        // Atualiza o placeholder específico no #userContentArea que era controlado separadamente
        if(loginPrompt && document.getElementById('loginPromptContent')) { // loginPrompt é o span, loginPromptContent é o novo ID
             document.getElementById('loginPromptContent').style.display = 'inline';
        }
        if(loggedInContentPlaceholder) loggedInContentPlaceholder.style.display = 'none';
    }

    async function fetchWithAuth(url, options = {}) {
        const token = getToken();
        console.log(LOG_PREFIX + `FetchComAuth para ${url}. Token: ${token ? 'presente' : 'ausente'}`);
        const headers = {
            ...options.headers,
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const response = await fetch(url, { ...options, headers });
            console.log(LOG_PREFIX + `Resposta de ${url} - Status: ${response.status}`);
            if (response.status === 401) {
                console.warn(LOG_PREFIX + "Erro 401 (Não Autorizado) recebido. Limpando token.");
                clearToken();
                loggedInUserInfo = null;
                updateHeaderUI(null);
                // Não vamos dar alert aqui, handlePageLoadAuth vai chamar setLoggedOutUI
                return null; 
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`}));
                console.error(LOG_PREFIX + `Erro HTTP não OK: ${response.status}`, errorData);
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            } else {
                return response; 
            }
        } catch (error) {
            console.error(LOG_PREFIX + 'Erro na requisição FetchComAuth:', error.message);
            // Se for erro de rede e não 401, o token pode ainda ser válido, não limpar automaticamente.
            // A lógica do chamador deve decidir o que fazer.
            throw error;
        }
    }
    
    async function handlePageLoadAuth() {
        console.log(LOG_PREFIX + "Iniciando handlePageLoadAuth. URL atual:", window.location.href);
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const errorFromUrl = urlParams.get('error');
        console.log(LOG_PREFIX + "Token da URL:", tokenFromUrl);
        console.log(LOG_PREFIX + "Erro da URL:", errorFromUrl);

        if (errorFromUrl) {
            alert(`Erro de login: ${errorFromUrl}. Tente novamente ou contate o suporte se persistir.`);
            console.error(LOG_PREFIX + "Erro detectado na URL:", errorFromUrl);
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }

        if (tokenFromUrl) {
            storeToken(tokenFromUrl);
            console.log(LOG_PREFIX + "Token da URL armazenado no localStorage.");
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }

        const currentToken = getToken();
        console.log(LOG_PREFIX + "Token recuperado do localStorage (getToken):", currentToken);

        if (currentToken) {
            try {
                showLoading(true);
                console.log(LOG_PREFIX + "Tentando buscar /auth/me com o token.");
                const userData = await fetchWithAuth(`${API_BASE_URL}/auth/me`);
                console.log(LOG_PREFIX + "Resposta de /auth/me (userData):", userData);

                if (userData && userData.discordId) {
                    console.log(LOG_PREFIX + "Dados do usuário (/auth/me) recebidos com sucesso. Atualizando UI.");
                    loggedInUserInfo = userData;
                    updateHeaderUI(loggedInUserInfo);
                    fetchAllTrackedUsers();
                } else {
                    console.warn(LOG_PREFIX + "/auth/me não retornou dados válidos ou userData foi null. Token pode ser inválido. Limpando.");
                    clearToken(); 
                    setLoggedOutUI();
                }
            } catch (error) {
                console.error(LOG_PREFIX + "Catch em handlePageLoadAuth após /auth/me:", error.message);
                // Se fetchWithAuth não limpou o token em um 401 (o que deveria), ou se foi outro erro
                // e suspeitamos que o token é a causa ou a sessão não pode ser mantida.
                // clearToken(); // Descomente se quiser forçar limpeza em qualquer erro aqui.
                setLoggedOutUI();
            } finally {
                showLoading(false);
            }
        } else {
            console.log(LOG_PREFIX + "Nenhum token encontrado no localStorage. Configurando UI para deslogado.");
            setLoggedOutUI();
        }
    }

    function logout() {
        console.log(LOG_PREFIX + "Logout chamado.");
        clearToken();
        loggedInUserInfo = null;
        setLoggedOutUI();
        // Opcional: redirecionar para a landing page se desejar
        // window.location.href = 'index.html'; 
    }
    
    // Event listener para o botão de login no header do dashboard
    if (dashboardLoginBtn) {
        dashboardLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log(LOG_PREFIX + "Botão de login do dashboard clicado. Redirecionando para API/auth/discord.");
            window.location.href = `${API_BASE_URL}/auth/discord`;
        });
    }
    // Event listener para o link de login no conteúdo principal (quando deslogado)
    // (O link é recriado em setLoggedOutUI, então o event listener precisa ser delegado ou recriado)
    // Uma forma mais simples é garantir que o clique no link simule o clique no botão do header, se ele existir.
    // Isso já foi feito dentro de setLoggedOutUI.

    if (logoutButtonHeader) {
        logoutButtonHeader.addEventListener('click', logout);
    }

    // --- Lógica Principal do Dashboard (Funções de renderização e fetch de dados) ---
    // (Cole aqui suas funções: showLoading, escapeHTML, formatDate, formatDateForSort,
    // fetchAllTrackedUsers, displayUserList, fetchAndDisplayUser, updateActiveFilterButtonDashboard,
    // renderFilteredContent, e todas as suas funções render*View*.
    // As funções fetchAllTrackedUsers e fetchAndDisplayUser já foram adaptadas para usar fetchWithAuth)
    
    // COLE SUAS FUNÇÕES DE UTILIDADE E RENDERIZAÇÃO AQUI
    // ... (exemplo de uma delas) ...
    function showLoading(show = true) { if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none'; }
    function escapeHTML(str) { if (str === null || str === undefined) return ''; return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');}
    function formatDate(dateSource) { if (!dateSource) return 'N/A'; let date; if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) { const dateValue = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date; date = new Date(dateValue); } else if (typeof dateSource === 'number') { date = new Date(dateSource); } else if (typeof dateSource === 'string') { if (dateSource.includes('-') || dateSource.includes(':') || dateSource.includes('T') || dateSource.includes('Z')) { date = new Date(dateSource); } else { const parsedTimestamp = parseInt(dateSource, 10); if (!isNaN(parsedTimestamp) && parsedTimestamp.toString().length === dateSource.length) { date = new Date(parsedTimestamp); } else { date = new Date(dateSource); }}} else { return 'Formato Desconhecido'; } if (!date || isNaN(date.getTime()) || date.getTime() <= 0) { if (typeof dateSource === 'string') { let lastAttemptDate = new Date(dateSource); if (lastAttemptDate && !isNaN(lastAttemptDate.getTime()) && lastAttemptDate.getTime() > 0) { date = lastAttemptDate; } else { return `Data Inválida [${typeof dateSource}: ${dateSource.toString().substring(0,50)}]`;}} else { return `Data Inválida [${typeof dateSource}]`;}} return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'});}
    function formatDateForSort(dateSource) { if (!dateSource) return 0; if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) { const pTs = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date; if (typeof pTs === 'number') return pTs; const d = new Date(pTs); return !isNaN(d.getTime()) ? d.getTime() : 0; } if (typeof dateSource === 'number') return dateSource; if (typeof dateSource === 'string') { const d = new Date(dateSource); if (!isNaN(d.getTime()) && d.getTime() > 0) return d.getTime(); const n = parseInt(dateSource, 10); if (!isNaN(n) && n.toString().length === dateSource.length) return n; } return 0;}

    async function fetchAllTrackedUsers() {
        if (!getToken()) {
            if(userListContainer) userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Faça login para carregar a lista de usuários.</p>';
            console.log(LOG_PREFIX + "fetchAllTrackedUsers: Usuário não logado, abortando.");
            return;
        }
        console.log(LOG_PREFIX + "fetchAllTrackedUsers: Iniciando busca de usuários.");
        showLoading(true);
        if (paginationControlsDiv) paginationControlsDiv.style.display = 'none';
        try {
            const users = await fetchWithAuth(`${API_BASE_URL}/users`);
            if (users) {
                console.log(LOG_PREFIX + "fetchAllTrackedUsers: Usuários recebidos, total:", users.length);
                users.sort((a, b) => formatDateForSort(b.last_seen_overall_at) - formatDateForSort(a.last_seen_overall_at));
                displayUserList(users);
            } else {
                console.warn(LOG_PREFIX + "fetchAllTrackedUsers: fetchWithAuth retornou null, provavelmente falha de autenticação.");
                // setLoggedOutUI() já deve ter sido chamado por fetchWithAuth ou handlePageLoadAuth
            }
        } catch (error) {
            console.error(LOG_PREFIX + 'Erro ao buscar todos os usuários:', error.message);
            if (userListContainer) userListContainer.innerHTML = `<p class="error-message">Falha ao carregar usuários: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    function displayUserList(users) { 
        if (!userListContainer) { console.error(LOG_PREFIX + "userListContainer não encontrado!"); return; }
        userListContainer.innerHTML = '';
        if (!users || users.length === 0) {
            userListContainer.innerHTML = '<p class="placeholder-text">Nenhum usuário rastreado encontrado.</p>';
            return;
        }
        const ul = document.createElement('ul'); ul.className = 'user-list';
        users.forEach(user => {
            const li = document.createElement('li'); li.className = 'user-list-item-enhanced';
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
                <img src="${latestAvatar}" alt="Avatar" class="user-avatar-small">
                <div class="user-info-column"><span class="username">${escapeHTML(currentUsername)}</span><span class="user-id">ID: ${escapeHTML(userIdDisplayValue)}</span></div>
                <div class="server-info-column"><span class="info-label"><i class="fas fa-server"></i>Último Servidor</span>${lastServerDisplay}</div>
                <div class="last-update-column"><span class="info-label"><i class="fas fa-history"></i>Última Atividade</span>${lastActivityDateDisplay}</div>
                <button class="dashboard-btn view-profile-btn" data-userid="${escapeHTML(userIdDisplayValue)}"><i class="fas fa-eye"></i>Ver Perfil</button>`;
            const viewProfileButton = li.querySelector('.view-profile-btn');
            if (viewProfileButton) {
                viewProfileButton.addEventListener('click', () => {
                    const userIdToFetch = viewProfileButton.dataset.userid;
                    if (userIdToFetch && userIdToFetch !== 'N/A' && !userIdToFetch.startsWith('[')) {
                        fetchAndDisplayUser(userIdToFetch, 'summary');
                        window.scrollTo({ top: document.querySelector('.user-search-section-dashboard')?.offsetTop || 0, behavior: 'smooth' });
                    } else { alert("ID de usuário inválido."); }
                });
            }
            ul.appendChild(li);
        });
        userListContainer.appendChild(ul);
    }

    async function fetchAndDisplayUser(userId, filterToShow = 'summary') {
        if (!getToken()) {
            alert("Por favor, faça login para ver os detalhes do usuário.");
            console.log(LOG_PREFIX + "fetchAndDisplayUser: Usuário não logado, abortando.");
            return;
        }
        if (!userId) { userContentArea.innerHTML = '<p class="error-message">ID inválido.</p>'; return; }
        console.log(LOG_PREFIX + `fetchAndDisplayUser: Buscando usuário ${userId}, filtro ${filterToShow}`);
        showLoading(true); currentUserData = null;
        try {
            const user = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
            if (user) {
                console.log(LOG_PREFIX + "fetchAndDisplayUser: Dados do usuário recebidos:", user);
                currentUserData = user;
                currentFilter = filterToShow;
                updateActiveFilterButtonDashboard();
                renderFilteredContent();
            } else {
                 console.warn(LOG_PREFIX + `fetchAndDisplayUser: Nenhum dado retornado para usuário ${userId} ou falha de auth.`);
                 userContentArea.innerHTML = `<p class="error-message">Usuário ID ${escapeHTML(userId)} não encontrado ou falha na autenticação.</p>`;
            }
        } catch (error) {
            console.error(LOG_PREFIX + `Erro ao buscar usuário ${userId}:`, error.message);
            userContentArea.innerHTML = `<p class="error-message">Falha ao carregar dados do usuário: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    function updateActiveFilterButtonDashboard() {
        filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
        if(adminPanelBtn) adminPanelBtn.classList.toggle('active', adminPanelBtn.dataset.filter === currentFilter);
    }

    function renderFilteredContent() {
        if (!userContentArea) return;
        userContentArea.innerHTML = ''; 
        if (!loggedInUserInfo) {
            userContentArea.innerHTML = `<p class="placeholder-text">Por favor, <a href="#" id="renderContentLoginLinkFallback">faça login</a> para ver o conteúdo.</p>`;
            const renderContentLoginLinkFallback = document.getElementById('renderContentLoginLinkFallback');
            if(renderContentLoginLinkFallback && dashboardLoginBtn) renderContentLoginLinkFallback.onclick = (e) => {e.preventDefault(); dashboardLoginBtn.click();};
            return;
        }
        if (!currentUserData && currentFilter !== 'admin_panel') { // Admin panel pode não depender de currentUserData
             userContentArea.innerHTML = `<p class="placeholder-text"><i class="fas fa-search" style="font-size:1.5em; margin-bottom:10px;"></i> Busque por um ID ou selecione um usuário da lista abaixo para ver os detalhes.</p>`;
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
            case 'admin_panel':
                if (loggedInUserInfo && loggedInUserInfo.role === 'admin') {
                    contentHTML = renderAdminPanelView(); 
                } else {
                    contentHTML = '<p class="error-message">Acesso negado ao painel admin.</p>';
                }
                break;
            default: contentHTML = '<p class="error-message">Filtro desconhecido.</p>';
        }
        userContentArea.innerHTML = contentHTML;
    }

    function renderSummaryView(user) { const latestAvatar = user.current_avatar_url || (user.avatar_url_history && user.avatar_url_history.length > 0 ? user.avatar_url_history[user.avatar_url_history.length - 1] : 'https://via.placeholder.com/128?text=?'); const latestBanner = (user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls[user.banner_urls.length - 1] : ''; const avatarCount = user.avatar_url_history ? user.avatar_url_history.length : 0; const bannerCount = user.banner_urls ? user.banner_urls.length : 0; const messageImageCount = user.message_image_history ? user.message_image_history.length : 0; const nicknameCount = user.username_global_history ? new Set(user.username_global_history.filter(n => n)).size : 0; const serverCount = user.servers ? user.servers.length : 0; const historyLogCount = user.history ? user.history.length : 0; const recentMessageCount = user.recent_messages ? user.recent_messages.length : 0; let userIdForDisplay = user.user_id ? user.user_id.toString() : 'N/A'; const currentUsername = user.current_username_global || user.username_global_history?.slice(-1)[0] || 'N/A'; return ` <div class="profile-section user-main-info"> ${latestBanner ? `<div class="profile-banner" style="background-image: url('${escapeHTML(latestBanner)}');"></div>` : '<div class="profile-banner-placeholder"><span>Sem Banner</span></div>'} <div class="profile-header-content"> <img src="${escapeHTML(latestAvatar)}" alt="Avatar" class="profile-avatar-large"> <div class="profile-name-id"> <h2>${escapeHTML(currentUsername)}</h2> <p>ID (Tracker): ${escapeHTML(userIdForDisplay)}</p> </div> </div> </div> <div class="profile-section quick-stats"> <div class="widget"><h3><i class="fas fa-user-edit"></i> Nomes Globais</h3><p>${nicknameCount}</p></div> <div class="widget"><h3><i class="fas fa-image"></i> Avatares</h3><p>${avatarCount}</p></div> <div class="widget"><h3><i class="fas fa-images"></i> Banners</h3><p>${bannerCount}</p></div> <div class="widget"><h3><i class="fas fa-server"></i> Servidores</h3><p>${serverCount}</p></div> <div class="widget"><h3><i class="fas fa-photo-film"></i> Imgs. Msg</h3><p>${messageImageCount}</p></div> <div class="widget"><h3><i class="fas fa-comments"></i> Msgs. Recentes</h3><p>${recentMessageCount}</p></div> <div class="widget"><h3><i class="fas fa-history"></i> Logs Hist. (DB)</h3><p>${historyLogCount}</p></div> </div> <div class="profile-section"> <h3><i class="fas fa-info-circle"></i> Informações Gerais (Tracker)</h3> <ul class="profile-list"> <li><strong>Primeira vez Visto:</strong> ${formatDate(user.first_seen_overall_at)}</li> <li><strong>Última Atividade:</strong> ${formatDate(user.last_seen_overall_at)}</li> </ul> </div>`;}
    function renderAvatarsView(user) { let html = '<div class="profile-section"><h3><i class="fas fa-image"></i> Galeria de Avatares</h3>'; if (user.avatar_url_history && user.avatar_url_history.length > 0) { html += '<div class="avatar-gallery">'; user.avatar_url_history.slice().reverse().forEach(url => { html += `<img src="${escapeHTML(url)}" alt="Avatar Histórico" class="history-avatar" onclick="window.open('${escapeHTML(url)}', '_blank')" title="Clique para abrir em nova aba">`; }); html += '</div>'; } else { html += '<p class="placeholder-text">Nenhum avatar histórico.</p>';} html += '</div>'; return html;}
    function renderBannersView(user) { let html = '<div class="profile-section"><h3><i class="fas fa-images"></i> Galeria de Banners</h3>'; if (user.banner_urls && user.banner_urls.length > 0) { html += '<div class="banner-gallery">'; user.banner_urls.slice().reverse().forEach(url => { html += `<img src="${escapeHTML(url)}" alt="Banner Histórico" class="history-banner-item" onclick="window.open('${escapeHTML(url)}', '_blank')" title="Clique para abrir em nova aba">`; }); html += '</div>'; } else { html += '<p class="placeholder-text">Nenhum banner histórico.</p>';} html += '</div>'; return html;}
    function renderMessageImagesGalleryView(user) { let html = `<div class="profile-section"><h3><i class="fas fa-photo-film"></i> Galeria de Imagens das Mensagens (Todas)</h3>`; const allMessageImages = user.message_image_history || []; if (allMessageImages.length > 0) { const sortedImages = [...allMessageImages].sort((a, b) => formatDateForSort(b.timestamp) - formatDateForSort(a.timestamp)); html += '<div class="avatar-gallery">'; sortedImages.forEach(imgData => { const titleText = `Servidor: ${escapeHTML(imgData.guild_name || 'N/A')}\nData: ${formatDate(imgData.timestamp)}\nID Mensagem: ${escapeHTML(imgData.message_id || 'N/A')}${imgData.content_snippet ? `\nTexto: ${escapeHTML(imgData.content_snippet)}` : ''}`; html += `<img src="${escapeHTML(imgData.url)}" alt="Imagem da Mensagem (ID: ${escapeHTML(imgData.message_id || 'N/A')})" class="history-avatar" onclick="window.open('${escapeHTML(imgData.url)}', '_blank')" title="${escapeHTML(titleText)}">`; }); html += '</div>'; } else { html += '<p class="placeholder-text">Nenhuma imagem de mensagem encontrada no histórico.</p>';} html += '</div>'; return html;}
    function renderNicknamesView(user) { let html = '<div class="profile-section"><h3><i class="fas fa-signature"></i> Histórico de Nomes Globais</h3>'; if (user.username_global_history && user.username_global_history.length > 0) { html += '<ul class="profile-list">'; const uniqueNames = [...new Set(user.username_global_history)].reverse(); uniqueNames.forEach(name => { html += `<li><strong>${escapeHTML(name) || 'N/A'}</strong></li>`;}); html += '</ul>'; } else { html += '<p class="placeholder-text">Nenhum nome global histórico.</p>';} html += '</div>'; return html;}
    function renderServersView(user) { let html = '<div class="profile-section"><h3><i class="fas fa-server"></i> Servidores Encontrados</h3>'; if (user.servers && user.servers.length > 0) { html += '<ul class="profile-list">'; const sortedServers = user.servers.slice().sort((a,b) => formatDateForSort(b.last_message_at || b.first_message_at) - formatDateForSort(a.last_message_at || a.first_message_at)); sortedServers.forEach(server => { html += `<li><strong>${escapeHTML(server.guild_name) || 'Nome Desconhecido'}</strong> (ID: ${escapeHTML(server.guild_id)})<br><small>Primeira msg: ${formatDate(server.first_message_at)}</small><br><small>Última msg: ${formatDate(server.last_message_at)}</small></li>`; }); html += '</ul>'; } else { html += '<p class="placeholder-text">Nenhum servidor registrado.</p>';} html += '</div>'; return html;}
    function renderMessagesView(user) { let html = '<div class="profile-section"><h3><i class="fas fa-comments"></i> Mensagens Recentes (Últimas 10)</h3>'; if (user.recent_messages && user.recent_messages.length > 0) { html += '<ul class="profile-list messages-list">'; user.recent_messages.slice().reverse().forEach(msg => { html += `<li class="message-item"><div class="message-header"><strong>${escapeHTML(msg.guild_name) || 'Servidor Desconhecido'}</strong><span class="message-timestamp">${formatDate(msg.timestamp)}</span></div><div class="message-content">${msg.content ? `<p class="message-text">${escapeHTML(msg.content)}</p>` : '<p class="message-text placeholder-text"><em>(Sem texto)</em></p>'}${msg.image_url ? `<a href="${msg.image_url}" target="_blank" rel="noopener noreferrer" class="message-image-link"><img src="${msg.image_url}" alt="Imagem" class="message-image"></a>` : ''}</div><div class="message-footer"><small>ID Msg: ${escapeHTML(msg.message_id) || 'N/A'}</small></div></li>`; }); html += '</ul>'; } else { html += '<p class="placeholder-text">Nenhuma mensagem recente.</p>';} html += '</div>'; return html;}
    function renderFullHistoryView(user) { let html = '<div class="profile-section"><h3><i class="fas fa-history"></i> Histórico Detalhado de Alterações (DB)</h3>'; if (user.history && user.history.length > 0) { html += '<ul class="profile-history-log profile-list">'; user.history.slice().reverse().forEach(entry => { html += `<li><strong>Alterado em:</strong> ${formatDate(entry.changed_at)}<pre>${escapeHTML(JSON.stringify(entry.changes, null, 2))}</pre></li>`; }); html += '</ul>'; } else { html += '<p class="placeholder-text">Nenhum histórico de alterações (DB).</p>';} html += '</div>'; return html;}
    function renderAdminPanelView() { return `<div class="profile-section"><h3><i class="fas fa-user-shield"></i> Painel Administrativo</h3><p>Bem-vindo ao Painel Admin, ${escapeHTML(loggedInUserInfo.username)}!</p><p>Funcionalidades de filtro de usuários serão implementadas aqui.</p></div>`;}

    // Event Listeners para filtros da sidebar
    const allFilterButtons = document.querySelectorAll('.dashboard-sidebar .filter-btn'); // Inclui o botão admin
    allFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!loggedInUserInfo && button.id !== 'adminPanelBtn') { // Permite clicar em admin para ver "acesso negado"
                alert("Por favor, faça login para usar os filtros.");
                return;
            }
            if (button.id === 'adminPanelBtn' && (!loggedInUserInfo || loggedInUserInfo.role !== 'admin')) {
                alert("Acesso negado ao painel admin.");
                 currentFilter = 'summary'; // Volta para um filtro padrão ou o anterior
                 // Força renderização do conteúdo de acesso negado dentro da lógica de renderFilteredContent
            } else {
                currentFilter = button.dataset.filter;
            }
            updateActiveFilterButtonDashboard();
            renderFilteredContent();
        });
    });

    if (searchUserBtn && searchUserIdInput) {
        const performSearch = () => {
            if (!loggedInUserInfo) { alert("Faça login para buscar usuários."); return; }
            const userIdToSearch = searchUserIdInput.value.trim();
            if (userIdToSearch) fetchAndDisplayUser(userIdToSearch, 'summary');
        };
        searchUserBtn.addEventListener('click', performSearch);
        searchUserIdInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') performSearch();
        });
    }
    
    handlePageLoadAuth();
    // A chamada inicial para updateActiveFilterButtonDashboard pode ser feita após handlePageLoadAuth
    // ou dentro dela quando o estado de login é conhecido e o filtro padrão definido.
    // Por enquanto, a UI de deslogado é o padrão. Se logado, handlePageLoadAuth define a UI.
});
