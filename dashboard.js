// dashboard.js (Completo e Atualizado com Painel Admin e todas as Views, incluindo Instagram Gallery)
document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://celestial-api.onrender.com'; // Ou seu endpoint local
    const LOG_PREFIX = "[DashboardJS] ";

    // Elementos do Header
    const userProfileArea = document.getElementById('userProfileArea');
    const dashboardLoginBtn = document.getElementById('dashboardLoginBtn');
    const userInfoDisplay = document.getElementById('userInfoDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const userRoleDisplay = document.getElementById('userRoleDisplay');
    const logoutButtonHeader = document.getElementById('logoutButtonHeader');
    const adminPanelBtn = document.getElementById('adminPanelBtn'); // Botão do painel admin na sidebar

    // Elementos do Conteúdo Principal
    const userListContainer = document.getElementById('userListContainer');
    const userContentArea = document.getElementById('userContentArea');
    const searchUserIdInput = document.getElementById('searchUserIdInput');
    const searchUserBtn = document.getElementById('searchUserBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    // const filterButtons = document.querySelectorAll('.dashboard-sidebar .filter-btn:not(#adminPanelBtn)'); // Esta linha não é mais necessária aqui se os event listeners são adicionados a 'allFilterButtons'
    const paginationControlsDiv = document.querySelector('.pagination-controls');
    
    let currentUserData = null; // Dados do usuário do tracker selecionado
    let currentFilter = 'summary'; // Filtro padrão para visualização de usuário
    let loggedInUserInfo = null; // Dados do usuário autenticado

    // --- Funções de Autenticação e UI do Header ---
    function getToken() { return localStorage.getItem('appToken'); }
    function storeToken(token) { localStorage.setItem('appToken', token); }
    function clearToken() { console.log(LOG_PREFIX + "Limpando token."); localStorage.removeItem('appToken'); }

    function updateHeaderUI(userData) {
        console.log(LOG_PREFIX + "Atualizando UI do Header:", userData);
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
            if (adminPanelBtn) adminPanelBtn.style.display = (userData.role === 'admin') ? 'block' : 'none';
        } else {
            setLoggedOutUIHeader();
        }
    }

    function setLoggedOutUIHeader() {
        console.log(LOG_PREFIX + "Configurando Header para deslogado.");
        if(userInfoDisplay) userInfoDisplay.style.display = 'none';
        if(logoutButtonHeader) logoutButtonHeader.style.display = 'none';
        if(dashboardLoginBtn) dashboardLoginBtn.style.display = 'flex';
        if(adminPanelBtn) adminPanelBtn.style.display = 'none';
    }
    
    function setLoggedOutUIFull() {
        setLoggedOutUIHeader();
        currentUserData = null;
        loggedInUserInfo = null;
        if (userContentArea) {
             userContentArea.innerHTML = `<p class="placeholder-text">
                <i class="fas fa-info-circle" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i>
                Bem-vindo ao Dashboard! <br>
                <span id="loginPromptContent">Por favor, <a href="#" id="mainContentLoginLink" class="login-link-prompt">faça login com Discord</a> para acessar os dados.</span>
            </p>`;
            const mainContentLoginLink = document.getElementById('mainContentLoginLink');
            if(mainContentLoginLink && dashboardLoginBtn) mainContentLoginLink.onclick = (e) => {e.preventDefault(); dashboardLoginBtn.click();};
        }
        if(userListContainer) userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Faça login para ver os usuários.</p>';
    }

    async function fetchWithAuth(url, options = {}) {
        const token = getToken();
        console.log(LOG_PREFIX + `FetchComAuth para ${url}. Token: ${token ? 'presente (' + token.substring(0,10) + '...)' : 'ausente'}`);
        const headers = { ...options.headers, 'Content-Type': 'application/json', };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        try {
            const response = await fetch(url, { ...options, headers });
            console.log(LOG_PREFIX + `Resposta de ${url} - Status: ${response.status}`);
            if (response.status === 401) { console.warn(LOG_PREFIX + "401 Não Autorizado. Limpando token."); clearToken(); loggedInUserInfo = null; updateHeaderUI(null); setLoggedOutUIFull(); return null; } // Atualizado para chamar setLoggedOutUIFull
            if (!response.ok) { const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`})); console.error(LOG_PREFIX + `Erro HTTP não OK: ${response.status}`, errorData); throw new Error(errorData.error || `HTTP error ${response.status}`);}
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) return response.json();
            return response;
        } catch (error) { console.error(LOG_PREFIX + 'Erro FetchComAuth:', error.message); throw error; }
    }
    
    async function handlePageLoadAuth() {
        console.log(LOG_PREFIX + "handlePageLoadAuth. URL:", window.location.href);
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const errorFromUrl = urlParams.get('error');

        if (errorFromUrl) { alert(`Erro de login: ${errorFromUrl}.`); console.error(LOG_PREFIX + "Erro da URL:", errorFromUrl); window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);}
        if (tokenFromUrl) { storeToken(tokenFromUrl); console.log(LOG_PREFIX + "Token da URL armazenado."); window.history.replaceState({}, document.title, window.location.pathname + window.location.hash); }

        const currentToken = getToken();
        console.log(LOG_PREFIX + "Token do localStorage:", currentToken ? currentToken.substring(0,10) + '...' : 'Nenhum');
        if (currentToken) {
            try {
                showLoading(true);
                console.log(LOG_PREFIX + "Buscando /auth/me.");
                const userData = await fetchWithAuth(`${API_BASE_URL}/auth/me`);
                console.log(LOG_PREFIX + "/auth/me resposta:", userData);
                if (userData && userData.discordId) {
                    loggedInUserInfo = userData;
                    updateHeaderUI(loggedInUserInfo);
                    if (currentFilter !== 'admin_panel') {
                        fetchAllTrackedUsers(); 
                    }
                    renderFilteredContent(); 
                } else { console.warn(LOG_PREFIX + "/auth/me falhou ou não retornou dados. Limpando token."); clearToken(); setLoggedOutUIFull(); }
            } catch (error) { console.error(LOG_PREFIX + "Catch /auth/me:", error.message); setLoggedOutUIFull();
            } finally { showLoading(false); }
        } else { console.log(LOG_PREFIX + "Nenhum token. UI deslogado."); setLoggedOutUIFull(); }
    }

    function logout() { console.log(LOG_PREFIX + "Logout."); clearToken(); loggedInUserInfo = null; setLoggedOutUIFull(); }
    
    if (dashboardLoginBtn) dashboardLoginBtn.addEventListener('click', (e) => { e.preventDefault(); console.log(LOG_PREFIX + "Login do dashboard clicado."); window.location.href = `${API_BASE_URL}/auth/discord`; });
    if (logoutButtonHeader) logoutButtonHeader.addEventListener('click', logout);

    // --- Lógica Principal do Dashboard ---
    function showLoading(show = true) { if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none'; }
    function escapeHTML(str) { if (str === null || str === undefined) return ''; return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');}
    function formatDate(dateSource) { if (!dateSource) return 'N/A'; let date; if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) { const dVal = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date; date = new Date(dVal); } else if (typeof dateSource === 'number') { date = new Date(dateSource); } else if (typeof dateSource === 'string') { if (dateSource.includes('-')||dateSource.includes(':')||dateSource.includes('T')||dateSource.includes('Z')) { date = new Date(dateSource); } else { const pTs = parseInt(dateSource, 10); if (!isNaN(pTs) && pTs.toString().length === dateSource.length) { date = new Date(pTs); } else { date = new Date(dateSource); }}} else { return 'Formato Desconhecido'; } if (!date || isNaN(date.getTime()) || date.getTime() <= 0) { if (typeof dateSource === 'string') { let laDate = new Date(dateSource); if (laDate && !isNaN(laDate.getTime()) && laDate.getTime() > 0) { date = laDate; } else { return `Data Inválida`;}} else { return `Data Inválida`;}} return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'});}
    function formatDateForSort(dateSource) { if (!dateSource) return 0; if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) { const pTs = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date; if (typeof pTs === 'number') return pTs; const d = new Date(pTs); return !isNaN(d.getTime()) ? d.getTime() : 0; } if (typeof dateSource === 'number') return dateSource; if (typeof dateSource === 'string') { const d = new Date(dateSource); if (!isNaN(d.getTime()) && d.getTime() > 0) return d.getTime(); const n = parseInt(dateSource, 10); if (!isNaN(n) && n.toString().length === dateSource.length) return n; } return 0;}

    async function fetchAllTrackedUsers() {
        if (!getToken()) { if(userListContainer) userListContainer.innerHTML = '<p class="placeholder-text">Login para ver usuários.</p>'; console.log(LOG_PREFIX + "fetchAllTrackedUsers: Não logado."); return; }
        console.log(LOG_PREFIX + "fetchAllTrackedUsers: Buscando."); showLoading(true);
        if (paginationControlsDiv) paginationControlsDiv.style.display = 'none';
        try {
            const users = await fetchWithAuth(`${API_BASE_URL}/users`);
            if (users) { console.log(LOG_PREFIX + "fetchAllTrackedUsers: Recebidos", users.length); users.sort((a, b) => formatDateForSort(b.last_seen_overall_at) - formatDateForSort(a.last_seen_overall_at)); displayUserList(users, userListContainer); }
        } catch (error) { console.error(LOG_PREFIX + 'Erro fetchAllTrackedUsers:', error.message); if (userListContainer) userListContainer.innerHTML = `<p class="error-message">Falha ao carregar usuários: ${error.message}</p>`; }
        finally { showLoading(false); }
    }
    
    function displayUserList(users, containerElement = userListContainer) {
        if (!containerElement) { console.error(LOG_PREFIX + "Elemento container para displayUserList não encontrado!", containerElement); return; }
        containerElement.innerHTML = '';
        if (!users || users.length === 0) {
            containerElement.innerHTML = '<p class="placeholder-text" style="padding:15px;">Nenhum usuário encontrado com os critérios.</p>';
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
                lastServerDisplay = `<span class="info-value" title="${escapeHTML(lastServer.guild_name || 'Nome Indisponível')}">${escapeHTML(lastServer.guild_name || 'Nome Indisponível')}</span>`;
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
                <div class="user-info-column"><span class="username" title="${escapeHTML(currentUsername)}">${escapeHTML(currentUsername)}</span><span class="user-id">ID (Tracker): ${escapeHTML(userIdDisplayValue)}</span></div>
                <div class="server-info-column"><span class="info-label"><i class="fas fa-server"></i>Último Servidor</span>${lastServerDisplay}</div>
                <div class="last-update-column"><span class="info-label"><i class="fas fa-history"></i>Última Atividade</span>${lastActivityDateDisplay}</div>
                <button class="dashboard-btn view-profile-btn" data-userid="${escapeHTML(userIdDisplayValue)}"><i class="fas fa-eye"></i>Ver Perfil</button>`;
            const viewProfileButton = li.querySelector('.view-profile-btn');
            if (viewProfileButton) {
                viewProfileButton.addEventListener('click', () => {
                    const userIdToFetch = viewProfileButton.dataset.userid;
                    if (userIdToFetch && userIdToFetch !== 'N/A' && !userIdToFetch.startsWith('[')) {
                        currentFilter = 'summary'; 
                        updateActiveFilterButtonDashboard(); 
                        fetchAndDisplayUser(userIdToFetch, 'summary'); 
                        window.scrollTo({ top: document.querySelector('.user-search-section-dashboard')?.offsetTop || 0, behavior: 'smooth' });
                    } else { alert("ID de usuário inválido."); }
                });
            }
            ul.appendChild(li);
        });
        containerElement.appendChild(ul);
    }

    async function fetchAndDisplayUser(userId, filterToShow = 'summary') { 
        if (!getToken()) { alert("Login para ver detalhes."); console.log(LOG_PREFIX + "fetchAndDisplayUser: Não logado."); return;}
        if (!userId) { userContentArea.innerHTML = '<p class="error-message">ID inválido.</p>'; return; }
        console.log(LOG_PREFIX + `fetchAndDisplayUser: Buscando ${userId}, filtro ${filterToShow}`); showLoading(true); currentUserData = null;
        try {
            const user = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
            if (user) { console.log(LOG_PREFIX + "fetchAndDisplayUser: Dados:", user); currentUserData = user; currentFilter = filterToShow; updateActiveFilterButtonDashboard(); renderFilteredContent(); }
            else { console.warn(LOG_PREFIX + `fetchAndDisplayUser: Sem dados para ${userId}.`); userContentArea.innerHTML = `<p class="error-message">Usuário ID (Tracker) ${escapeHTML(userId)} não encontrado ou falha na autenticação.</p>`;}
        } catch (error) { console.error(LOG_PREFIX + `Erro fetch ${userId}:`, error.message); userContentArea.innerHTML = `<p class="error-message">Falha ao carregar dados do usuário: ${error.message}</p>`;}
        finally { showLoading(false); }
    }
    
    function updateActiveFilterButtonDashboard() {
        document.querySelectorAll('.dashboard-sidebar .filter-btn').forEach(btn => btn.classList.remove('active'));
        const buttonToActivate = document.querySelector(`.dashboard-sidebar .filter-btn[data-filter="${currentFilter}"]`);
        if (buttonToActivate) {
            buttonToActivate.classList.add('active');
        }
    }

    function renderFilteredContent() {
        if (!userContentArea) return; userContentArea.innerHTML = ''; 
        if (!loggedInUserInfo) { setLoggedOutUIFull(); return; } 
        
        if (currentFilter === 'admin_panel') {
            if (loggedInUserInfo.role === 'admin') {
                userContentArea.innerHTML = renderAdminPanelView();
            } else {
                userContentArea.innerHTML = '<p class="error-message">Acesso negado ao painel admin.</p>';
            }
            return;
        }
        
        if (!currentUserData) {
            userContentArea.innerHTML = `<p class="placeholder-text"><i class="fas fa-search" style="font-size:1.5em; margin-bottom:10px;"></i> Busque por um ID (tracker) ou selecione um usuário da lista para ver os detalhes.</p>`;
            return;
        }
        let contentHTML = '';
        switch (currentFilter) {
            case 'summary': contentHTML = renderSummaryView(currentUserData); break;
            case 'avatars': contentHTML = renderAvatarsView(currentUserData); break;
            case 'banners': contentHTML = renderBannersView(currentUserData); break;
            case 'message_images_gallery': contentHTML = renderMessageImagesGalleryView(currentUserData); break;
            case 'instagram_gallery': contentHTML = renderInstagramGalleryView(currentUserData); break; // <-- NOVO CASE
            case 'nicknames': contentHTML = renderNicknamesView(currentUserData); break;
            case 'servers': contentHTML = renderServersView(currentUserData); break;
            case 'messages': contentHTML = renderMessagesView(currentUserData); break;
            case 'fullHistory': contentHTML = renderFullHistoryView(currentUserData); break;
            default: contentHTML = '<p class="error-message">Filtro desconhecido.</p>';
        }
        userContentArea.innerHTML = contentHTML;
    }

    // --- Funções de Renderização de Views ---
    function renderSummaryView(user) { 
        const latestAvatar = user.current_avatar_url || (user.avatar_url_history && user.avatar_url_history.length > 0 ? user.avatar_url_history[user.avatar_url_history.length - 1] : 'https://via.placeholder.com/128?text=?'); 
        const latestBanner = (user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls[user.banner_urls.length - 1] : ''; 
        const avatarCount = user.avatar_url_history?.length || 0; 
        const bannerCount = user.banner_urls?.length || 0; 
        const messageImageCount = user.message_image_history?.length || 0; 
        const instagramPostCount = user.instagram?.length || 0; // <-- Contagem para Instagram
        const nicknameCount = user.username_global_history ? new Set(user.username_global_history.filter(n => n)).size : 0;  
        const serverCount = user.servers?.length || 0; 
        const historyLogCount = user.history?.length || 0; 
        const recentMessageCount = user.recent_messages?.length || 0; 
        let userIdForDisplay = user.user_id ? user.user_id.toString() : 'N/A'; 
        const currentUsername = user.current_username_global || user.username_global_history?.slice(-1)[0] || 'N/A'; 
        return ` <div class="profile-section user-main-info"> ${latestBanner ? `<div class="profile-banner" style="background-image: url('${escapeHTML(latestBanner)}');"></div>` : '<div class="profile-banner-placeholder"><span>Sem Banner</span></div>'} <div class="profile-header-content"> <img src="${escapeHTML(latestAvatar)}" alt="Avatar" class="profile-avatar-large"> <div class="profile-name-id"> <h2 title="${escapeHTML(currentUsername)}">${escapeHTML(currentUsername)}</h2> <p>ID (Tracker): ${escapeHTML(userIdForDisplay)}</p> </div> </div> </div> <div class="profile-section quick-stats"> <div class="widget"><h3><i class="fas fa-user-edit"></i> Nomes Globais</h3><p>${nicknameCount}</p></div> <div class="widget"><h3><i class="fas fa-image"></i> Avatares</h3><p>${avatarCount}</p></div> <div class="widget"><h3><i class="fas fa-images"></i> Banners</h3><p>${bannerCount}</p></div> <div class="widget"><h3><i class="fas fa-server"></i> Servidores</h3><p>${serverCount}</p></div> <div class="widget"><h3><i class="fas fa-photo-film"></i> Imgs. Msg</h3><p>${messageImageCount}</p></div> <div class="widget"><h3><i class="fab fa-instagram"></i> Posts Insta</h3><p>${instagramPostCount}</p></div> <div class="widget"><h3><i class="fas fa-comments"></i> Msgs. Recentes</h3><p>${recentMessageCount}</p></div> <div class="widget"><h3><i class="fas fa-history"></i> Logs Hist. (DB)</h3><p>${historyLogCount}</p></div> </div> <div class="profile-section"> <h3><i class="fas fa-info-circle"></i> Informações Gerais (Tracker)</h3> <ul class="profile-list"> <li><strong>Primeira vez Visto:</strong> ${formatDate(user.first_seen_overall_at)}</li> <li><strong>Última Atividade:</strong> ${formatDate(user.last_seen_overall_at)}</li> </ul> </div>`;
    }
    function renderAvatarsView(user) { 
        let html = '<div class="profile-section"><h3><i class="fas fa-image"></i> Galeria de Avatares</h3>'; 
        if (user.avatar_url_history && user.avatar_url_history.length > 0) { 
            html += '<div class="avatar-gallery">'; 
            user.avatar_url_history.slice().reverse().forEach(url => { html += `<img src="${escapeHTML(url)}" alt="Avatar Histórico" class="history-avatar" onclick="window.open('${escapeHTML(url)}', '_blank')" title="Clique para abrir em nova aba">`; }); 
            html += '</div>'; 
        } else { html += '<p class="placeholder-text">Nenhum avatar histórico.</p>';} 
        html += '</div>'; return html;
    }
    function renderBannersView(user) { 
        let html = '<div class="profile-section"><h3><i class="fas fa-images"></i> Galeria de Banners</h3>'; 
        if (user.banner_urls && user.banner_urls.length > 0) { 
            html += '<div class="banner-gallery">'; 
            user.banner_urls.slice().reverse().forEach(url => { html += `<img src="${escapeHTML(url)}" alt="Banner Histórico" class="history-banner-item" onclick="window.open('${escapeHTML(url)}', '_blank')" title="Clique para abrir em nova aba">`; }); 
            html += '</div>'; 
        } else { html += '<p class="placeholder-text">Nenhum banner histórico.</p>';} 
        html += '</div>'; return html;
    }
    function renderMessageImagesGalleryView(user) { 
        let html = `<div class="profile-section"><h3><i class="fas fa-photo-film"></i> Galeria de Imagens das Mensagens (Todas)</h3>`; 
        const allMessageImages = user.message_image_history || []; 
        if (allMessageImages.length > 0) { 
            const sortedImages = [...allMessageImages].sort((a, b) => formatDateForSort(b.timestamp) - formatDateForSort(a.timestamp)); 
            html += '<div class="avatar-gallery">'; 
            sortedImages.forEach(imgData => { const titleText = `Servidor: ${escapeHTML(imgData.guild_name || 'N/A')}\nData: ${formatDate(imgData.timestamp)}\nID Mensagem: ${escapeHTML(imgData.message_id || 'N/A')}${imgData.content_snippet ? `\nTexto: ${escapeHTML(imgData.content_snippet)}` : ''}`; html += `<img src="${escapeHTML(imgData.url)}" alt="Imagem da Mensagem (ID: ${escapeHTML(imgData.message_id || 'N/A')})" class="history-avatar" onclick="window.open('${escapeHTML(imgData.url)}', '_blank')" title="${escapeHTML(titleText)}">`; }); 
            html += '</div>'; 
        } else { html += '<p class="placeholder-text">Nenhuma imagem de mensagem encontrada no histórico.</p>';} 
        html += '</div>'; return html;
    }

    // --- NOVA FUNÇÃO DE RENDERIZAÇÃO PARA GALERIA INSTAGRAM ---
    function renderInstagramGalleryView(user) {
        let html = `<div class="profile-section"><h3><i class="fab fa-instagram"></i> Galeria Instagram (Menções)</h3>`;
        
        const instagramPosts = user.instagram || [];

        if (instagramPosts.length > 0) {
            const sortedPosts = [...instagramPosts].sort((a, b) => formatDateForSort(b.timestamp) - formatDateForSort(a.timestamp));
            
            html += '<div class="avatar-gallery">'; // Reutiliza a classe .avatar-gallery
            sortedPosts.forEach(post => {
                const titleText = `Postado por: ${escapeHTML(post.postedByUsername || 'N/A')} (ID: ${escapeHTML(post.postedByUserId || 'N/A')})\nData: ${formatDate(post.timestamp)}\nID Mensagem Original: ${escapeHTML(post.messageId || 'N/A')}\nServidor: ${escapeHTML(post.guildId || 'N/A')} | Canal: ${escapeHTML(post.channelId || 'N/A')}`;
                // Usando a estrutura de gallery-item-container para melhor agrupamento
                html += `
                    <div class="gallery-item-container"> 
                        <img 
                            src="${escapeHTML(post.imageUrl)}" 
                            alt="Post do Instagram (ID Msg: ${escapeHTML(post.messageId || 'N/A')})" 
                            class="history-avatar" 
                            onclick="window.open('${escapeHTML(post.imageUrl)}', '_blank')" 
                            title="${escapeHTML(titleText)}">
                        <div class="gallery-item-caption">
                            Postado por: ${escapeHTML(post.postedByUsername || 'N/A')}<br>
                            <small>${formatDate(post.timestamp)}</small>
                        </div>
                    </div>`;
            });
            html += '</div>';
        } else {
            html += '<p class="placeholder-text">Nenhuma postagem do Instagram encontrada para este usuário.</p>';
        }
        html += '</div>';
        return html;
    }
    // --- FIM DA NOVA FUNÇÃO ---

    function renderNicknamesView(user) { 
        let html = '<div class="profile-section"><h3><i class="fas fa-signature"></i> Histórico de Nomes Globais</h3>'; 
        if (user.username_global_history && user.username_global_history.length > 0) { 
            html += '<ul class="profile-list">'; 
            const uniqueNames = [...new Set(user.username_global_history)].reverse(); 
            uniqueNames.forEach(name => { html += `<li><strong>${escapeHTML(name) || 'N/A'}</strong></li>`;}); 
            html += '</ul>'; 
        } else { html += '<p class="placeholder-text">Nenhum nome global histórico.</p>';} 
        html += '</div>'; return html;
    }
    function renderServersView(user) { 
        let html = '<div class="profile-section"><h3><i class="fas fa-server"></i> Servidores Encontrados</h3>'; 
        if (user.servers && user.servers.length > 0) { 
            html += '<ul class="profile-list">'; 
            const sortedServers = user.servers.slice().sort((a,b) => formatDateForSort(b.last_message_at || b.first_message_at) - formatDateForSort(a.last_message_at || a.first_message_at)); 
            sortedServers.forEach(server => { html += `<li><strong>${escapeHTML(server.guild_name) || 'Nome Desconhecido'}</strong> (ID: ${escapeHTML(server.guild_id)})<br><small>Primeira msg: ${formatDate(server.first_message_at)}</small><br><small>Última msg: ${formatDate(server.last_message_at)}</small></li>`; }); 
            html += '</ul>'; 
        } else { html += '<p class="placeholder-text">Nenhum servidor registrado.</p>';} 
        html += '</div>'; return html;
    }
    function renderMessagesView(user) { 
        let html = '<div class="profile-section"><h3><i class="fas fa-comments"></i> Mensagens Recentes (Últimas 10)</h3>'; 
        if (user.recent_messages && user.recent_messages.length > 0) { 
            html += '<ul class="profile-list messages-list">'; 
            user.recent_messages.slice().reverse().forEach(msg => { html += `<li class="message-item"><div class="message-header"><strong title="${escapeHTML(msg.guild_name) || 'Servidor Desconhecido'}">${escapeHTML(msg.guild_name) || 'Servidor Desconhecido'}</strong><span class="message-timestamp">${formatDate(msg.timestamp)}</span></div><div class="message-content">${msg.content ? `<p class="message-text">${escapeHTML(msg.content)}</p>` : '<p class="message-text placeholder-text"><em>(Sem texto)</em></p>'}${msg.image_url ? `<a href="${msg.image_url}" target="_blank" rel="noopener noreferrer" class="message-image-link"><img src="${msg.image_url}" alt="Imagem da mensagem" class="message-image"></a>` : ''}</div><div class="message-footer"><small>ID Msg: ${escapeHTML(msg.message_id) || 'N/A'}</small></div></li>`; }); 
            html += '</ul>'; 
        } else { html += '<p class="placeholder-text">Nenhuma mensagem recente.</p>';} 
        html += '</div>'; return html;
    }
    function renderFullHistoryView(user) { 
        let html = '<div class="profile-section"><h3><i class="fas fa-history"></i> Histórico Detalhado de Alterações (DB)</h3>'; 
        if (user.history && user.history.length > 0) { 
            html += '<ul class="profile-history-log profile-list">'; 
            user.history.slice().reverse().forEach(entry => { html += `<li><strong>Alterado em:</strong> ${formatDate(entry.changed_at)}<pre>${escapeHTML(JSON.stringify(entry.changes, null, 2))}</pre></li>`; }); 
            html += '</ul>'; 
        } else { html += '<p class="placeholder-text">Nenhum histórico de alterações (DB).</p>';} 
        html += '</div>'; return html;
    }

    // --- Funções do Painel Admin ---
    function renderAdminPanelView() {
        console.log(LOG_PREFIX + "Renderizando Painel Admin.");
        let html = `<div class="profile-section admin-main-panel"><h3><i class="fas fa-user-shield"></i> Painel Administrativo</h3>`;
        html += `<p>Logado como: ${escapeHTML(loggedInUserInfo.username)} (${escapeHTML(loggedInUserInfo.role)})</p>`;
        html += `<div class="admin-section"><h4>Estatísticas Gerais</h4><div id="adminStatsArea"><p><i class="fas fa-spinner fa-spin"></i> Carregando...</p></div></div>`;
        html += `<div class="admin-section"><h4>Configuração de Roles (IDs Discord)</h4><div id="adminRoleConfigArea"><p><i class="fas fa-spinner fa-spin"></i> Carregando...</p></div></div>`;
        html += `
            <div class="admin-section">
                <h4>Filtrar Usuários Rastreados</h4>
                <div class="admin-filters">
                    <div><input type="checkbox" id="filterHasMessageImages" name="hasMessageImages"><label for="filterHasMessageImages">Possui imagens de mensagens?</label></div>
                    <div><input type="checkbox" id="filterHasAvatarHistory" name="hasAvatarHistory"><label for="filterHasAvatarHistory">Possui histórico de avatares?</label></div>
                    <div><input type="checkbox" id="filterHasInstagram" name="hasInstagramPosts"><label for="filterHasInstagram">Possui posts Instagram?</label></div> 
                    <div><label for="filterUsernameContains">Nome Global Contém:</label><input type="text" id="filterUsernameContains" name="usernameContains" placeholder="Ex: astroboy"></div>
                    <div><label for="filterDiscordId">ID (Tracker/Discord):</label><input type="text" id="filterDiscordId" name="discordId" placeholder="ID numérico"></div>
                    <button id="applyUserFiltersBtn" class="dashboard-btn" style="background-color: #06b6d4; border-color: #0891b2;"><i class="fas fa-filter"></i> Aplicar Filtros</button>
                </div>
                <div id="adminFilteredUserListArea" style="margin-top: 20px; min-height: 100px;"><p class="placeholder-text">Use os filtros para buscar.</p></div>
            </div>`;
        html += `</div>`;

        setTimeout(() => { // Adiciona event listeners após o HTML ser inserido no DOM
            const applyFiltersBtn = document.getElementById('applyUserFiltersBtn');
            if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', handleApplyAdminUserFilters);
            fetchAdminStats();
            fetchAdminRoleConfig();
        }, 0);
        return html;
    }

    async function fetchAdminStats() { 
        const statsArea = document.getElementById('adminStatsArea'); 
        if (!statsArea) return; 
        console.log(LOG_PREFIX + "Buscando estatísticas admin."); 
        try { 
            const stats = await fetchWithAuth(`${API_BASE_URL}/admin/stats`); 
            if (stats) { 
                statsArea.innerHTML = `<ul class="profile-list">
                    <li><strong>Total Usuários Rastreados:</strong> ${stats.totalTrackedUsers ?? 'N/A'}</li>
                    <li><strong>Total Imagens de Mensagens:</strong> ${stats.totalMessageImages ?? 'N/A'}</li>
                    <li><strong>Total Posts Instagram:</strong> ${stats.totalInstagramImages ?? 'N/A'}</li> 
                </ul>`; 
            } else { 
                statsArea.innerHTML = '<p>Não foi possível carregar estatísticas.</p>';
            }
        } catch (e) { 
            console.error(LOG_PREFIX+"Erro stats admin:", e.message); 
            statsArea.innerHTML = `<p class="error-message">Erro: ${e.message}</p>`;
        }
    }
    async function fetchAdminRoleConfig() { 
        const roleConfigArea = document.getElementById('adminRoleConfigArea'); 
        if (!roleConfigArea) return; 
        console.log(LOG_PREFIX + "Buscando config roles."); 
        try { 
            const r = await fetchWithAuth(`${API_BASE_URL}/admin/roles/config`); 
            if (r) { 
                roleConfigArea.innerHTML = `<div><strong>Admins:</strong><pre>${escapeHTML(r.adminIds?.join('\n')||'Nenhum')}</pre></div><div style="margin-top:10px;"><strong>Premium:</strong><pre>${escapeHTML(r.premiumIds?.join('\n')||'Nenhum')}</pre></div>`;
            } else {
                roleConfigArea.innerHTML = '<p>Não foi possível carregar roles.</p>';
            }
        } catch (e) { 
            console.error(LOG_PREFIX+"Erro config roles:", e.message); 
            roleConfigArea.innerHTML = `<p class="error-message">Erro: ${e.message}</p>`;
        }
    }
    async function handleApplyAdminUserFilters() { 
        const f = {
            hasMessageImages:document.getElementById('filterHasMessageImages').checked, 
            hasAvatarHistory:document.getElementById('filterHasAvatarHistory').checked, 
            hasInstagramPosts: document.getElementById('filterHasInstagram').checked, // <-- Ler filtro Instagram
            usernameContains:document.getElementById('filterUsernameContains').value.trim(), 
            discordId:document.getElementById('filterDiscordId').value.trim()
        }; 
        const area = document.getElementById('adminFilteredUserListArea'); 
        if (!area) return; 
        console.log(LOG_PREFIX+"Aplicando filtros admin:", f); 
        area.innerHTML = `<p><i class="fas fa-spinner fa-spin"></i> Buscando...</p>`; 
        const qP = new URLSearchParams(); 
        if(f.hasMessageImages)qP.append('hasMessageImages','true'); 
        if(f.hasAvatarHistory)qP.append('hasAvatarHistory','true'); 
        if(f.hasInstagramPosts)qP.append('hasInstagramPosts', 'true'); // <-- Adicionar filtro Instagram à query
        if(f.usernameContains)qP.append('usernameContains',f.usernameContains); 
        if(f.discordId)qP.append('discordId',f.discordId); 
        try {
            showLoading(true); 
            const u = await fetchWithAuth(`${API_BASE_URL}/admin/users/filter?${qP.toString()}`); 
            if(u){
                displayUserList(u,area); 
                if(u.length===0)area.innerHTML='<p class="placeholder-text">Nenhum usuário com esses filtros.</p>';
            } else {
                area.innerHTML='<p class="error-message">Falha ao buscar ou acesso negado.</p>';
            }
        } catch(e){
            console.error(LOG_PREFIX+"Erro filtros admin:",e.message); 
            area.innerHTML=`<p class="error-message">Erro: ${e.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    // Event Listeners para filtros da sidebar
    const allFilterButtons = document.querySelectorAll('.dashboard-sidebar .filter-btn');
    allFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetFilter = button.dataset.filter;
            if (!loggedInUserInfo && targetFilter !== 'admin_panel') { 
                alert("Por favor, faça login para usar os filtros.");
                return;
            }
            if (targetFilter === 'admin_panel' && (!loggedInUserInfo || loggedInUserInfo.role !== 'admin')) {
                 currentFilter = targetFilter; 
            } else {
                currentFilter = targetFilter;
            }
            updateActiveFilterButtonDashboard();
            renderFilteredContent();
        });
    });

    if (searchUserBtn && searchUserIdInput) {
        const performSearch = () => {
            if (!loggedInUserInfo) { alert("Faça login para buscar usuários."); return; }
            const userIdToSearch = searchUserIdInput.value.trim();
            if (userIdToSearch) {
                currentFilter = 'summary'; 
                updateActiveFilterButtonDashboard();
                fetchAndDisplayUser(userIdToSearch, 'summary');
            }
        };
        searchUserBtn.addEventListener('click', performSearch);
        searchUserIdInput.addEventListener('keypress', (event) => { if (event.key === 'Enter') performSearch(); });
    }
    
    handlePageLoadAuth();
    updateActiveFilterButtonDashboard(); 
});
