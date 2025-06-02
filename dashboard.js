document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://celestial-api.onrender.com'; // Ou seu endpoint local

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
    const filterButtons = document.querySelectorAll('.dashboard-sidebar .filter-btn:not(#adminPanelBtn)'); // Exclui admin button daqui
    const paginationControlsDiv = document.querySelector('.pagination-controls');
    
    const loginPrompt = document.getElementById('loginPrompt');
    const loggedInContentPlaceholder = document.getElementById('loggedInContentPlaceholder');
    const inlineLoginLink = document.getElementById('inlineLoginLink');


    let currentUserData = null; // Dados do usuário do tracker selecionado
    let currentFilter = 'summary';
    let loggedInUserInfo = null; // Dados do usuário autenticado (Discord via JWT)

    // --- Funções de Autenticação e UI ---
    function getToken() {
        return localStorage.getItem('appToken');
    }

    function storeToken(token) {
        localStorage.setItem('appToken', token);
    }

    function clearToken() {
        localStorage.removeItem('appToken');
    }

    function updateHeaderUI(userData) {
        if (userData && userData.username) {
            if(userAvatar) userAvatar.src = userData.avatar || `https://cdn.discordapp.com/embed/avatars/0.png`; // Avatar padrão se null
            if(usernameDisplay) usernameDisplay.textContent = userData.username;
            if(userRoleDisplay) {
                userRoleDisplay.textContent = userData.role;
                userRoleDisplay.className = ''; // Limpa classes antigas
                userRoleDisplay.classList.add('role-' + userData.role.toLowerCase()); // Adiciona classe para estilização
            }

            if(userInfoDisplay) userInfoDisplay.style.display = 'flex';
            if(dashboardLoginBtn) dashboardLoginBtn.style.display = 'none';
            if(logoutButtonHeader) logoutButtonHeader.style.display = 'inline-block';

            // Mostrar botão do painel admin se o usuário for admin
            if (adminPanelBtn && userData.role === 'admin') {
                adminPanelBtn.style.display = 'block';
            } else if (adminPanelBtn) {
                adminPanelBtn.style.display = 'none';
            }
            if(loginPrompt) loginPrompt.style.display = 'none';
            if(loggedInContentPlaceholder) loggedInContentPlaceholder.style.display = 'inline';


        } else {
            setLoggedOutUI();
        }
    }

    function setLoggedOutUI() {
        if(userInfoDisplay) userInfoDisplay.style.display = 'none';
        if(logoutButtonHeader) logoutButtonHeader.style.display = 'none';
        if(dashboardLoginBtn) dashboardLoginBtn.style.display = 'flex'; // Mostra botão de login no header
        if(adminPanelBtn) adminPanelBtn.style.display = 'none'; // Esconde botão admin

        // Limpa dados do usuário e conteúdo principal se estiver deslogado
        currentUserData = null;
        loggedInUserInfo = null;
        if (userContentArea) {
             userContentArea.innerHTML = `<p class="placeholder-text">
                <i class="fas fa-info-circle" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i>
                Bem-vindo ao Dashboard! <br>
                Por favor, <a href="#" id="mainContentLoginLink">faça login com Discord</a> para acessar os dados.
            </p>`;
            const mainContentLoginLink = document.getElementById('mainContentLoginLink');
            if(mainContentLoginLink && dashboardLoginBtn) mainContentLoginLink.onclick = () => dashboardLoginBtn.click();
        }
        if(userListContainer) userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Faça login para ver os usuários.</p>';
        if(loginPrompt) loginPrompt.style.display = 'inline';
        if(loggedInContentPlaceholder) loggedInContentPlaceholder.style.display = 'none';
    }

    async function fetchWithAuth(url, options = {}) {
        const token = getToken();
        const headers = {
            ...options.headers,
            'Content-Type': 'application/json',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401) { // Token inválido ou expirado
                clearToken();
                loggedInUserInfo = null;
                updateHeaderUI(null); // Atualiza header para estado deslogado
                alert('Sua sessão expirou ou é inválida. Por favor, faça login novamente.');
                // Poderia redirecionar para a página de login ou mostrar um prompt mais elaborado
                return null; // Indica falha na autenticação
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP error ${response.status}`}));
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            // Se o content-type for json, parseia, senão retorna response direto (para casos como no-content)
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return response.json();
            } else {
                return response; // ou response.text() se esperar texto
            }
        } catch (error) {
            console.error('Erro na requisição Fetch:', error);
            throw error; // Re-throw para ser pego pelo chamador
        }
    }
    
    async function handlePageLoadAuth() {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');
        const errorFromUrl = urlParams.get('error');

        if (errorFromUrl) {
            alert(`Erro de login: ${errorFromUrl}. Tente novamente.`);
            // Limpa o parâmetro de erro da URL
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }

        if (tokenFromUrl) {
            storeToken(tokenFromUrl);
            // Limpa o token da URL para não ficar visível
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }

        const currentToken = getToken();
        if (currentToken) {
            try {
                showLoading(true);
                const userData = await fetchWithAuth(`${API_BASE_URL}/auth/me`);
                if (userData && userData.discordId) { // Verifica se userData é válido
                    loggedInUserInfo = userData;
                    updateHeaderUI(loggedInUserInfo);
                    fetchAllTrackedUsers(); // Carrega usuários rastreados se logado
                } else {
                    // fetchWithAuth já deve ter lidado com 401 e limpado o token.
                    // Se chegou aqui com token mas /auth/me falhou por outro motivo ou retornou null:
                    setLoggedOutUI();
                }
            } catch (error) {
                console.error('Erro ao buscar dados do usuário (/auth/me):', error);
                clearToken(); // Limpa token inválido
                setLoggedOutUI();
            } finally {
                showLoading(false);
            }
        } else {
            setLoggedOutUI();
        }
    }

    function logout() {
        clearToken();
        loggedInUserInfo = null;
        setLoggedOutUI();
        // Opcional: redirecionar para a landing page ou mostrar mensagem
        // window.location.href = 'index.html'; 
    }

    if (dashboardLoginBtn) {
        dashboardLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = `${API_BASE_URL}/auth/discord`;
        });
    }
    if (inlineLoginLink && dashboardLoginBtn) {
        inlineLoginLink.addEventListener('click', (e) => {
             e.preventDefault();
             dashboardLoginBtn.click(); // Simula clique no botão de login do header
        });
    }


    if (logoutButtonHeader) {
        logoutButtonHeader.addEventListener('click', logout);
    }

    // --- Lógica Principal do Dashboard (adaptada para usar fetchWithAuth) ---
    function showLoading(show = true) {
        if (loadingIndicator) loadingIndicator.style.display = show ? 'flex' : 'none';
    }
    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }
    function formatDate(dateSource) { /* Sua função formatDate existente */ 
        if (!dateSource) return 'N/A';
        let date;
        if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) {
            const dateValue = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date;
            date = new Date(dateValue);
        } else if (typeof dateSource === 'number') {
            date = new Date(dateSource);
        } else if (typeof dateSource === 'string') {
            if (dateSource.includes('-') || dateSource.includes(':') || dateSource.includes('T') || dateSource.includes('Z')) {
                date = new Date(dateSource);
            } else {
                const parsedTimestamp = parseInt(dateSource, 10);
                if (!isNaN(parsedTimestamp) && parsedTimestamp.toString().length === dateSource.length) {
                    date = new Date(parsedTimestamp);
                } else { date = new Date(dateSource); }
            }
        } else { return 'Formato Desconhecido'; }
        if (!date || isNaN(date.getTime()) || date.getTime() <= 0) {
            if (typeof dateSource === 'string') {
                let lastAttemptDate = new Date(dateSource);
                if (lastAttemptDate && !isNaN(lastAttemptDate.getTime()) && lastAttemptDate.getTime() > 0) {
                    date = lastAttemptDate;
                } else { return `Data Inválida [${typeof dateSource}: ${dateSource.toString().substring(0,50)}]`;}
            } else { return `Data Inválida [${typeof dateSource}]`;}
        }
        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'});
    }
    function formatDateForSort(dateSource) { /* Sua função formatDateForSort existente */
        if (!dateSource) return 0;
        if (typeof dateSource === 'object' && dateSource !== null && '$date' in dateSource) {
            const potentialTimestamp = dateSource.$date.$numberLong ? parseInt(dateSource.$date.$numberLong, 10) : dateSource.$date;
            if (typeof potentialTimestamp === 'number') return potentialTimestamp;
            const d = new Date(potentialTimestamp); return !isNaN(d.getTime()) ? d.getTime() : 0;
        }
        if (typeof dateSource === 'number') return dateSource;
        if (typeof dateSource === 'string') {
            const d = new Date(dateSource);
            if (!isNaN(d.getTime()) && d.getTime() > 0) return d.getTime();
            const n = parseInt(dateSource, 10);
            if (!isNaN(n) && n.toString().length === dateSource.length) return n;
        }
        return 0;
    }

    async function fetchAllTrackedUsers() {
        if (!getToken()) { // Não busca se não estiver logado
            if(userListContainer) userListContainer.innerHTML = '<p class="placeholder-text" style="font-size:1em; padding:15px;">Faça login para carregar a lista de usuários.</p>';
            return;
        }
        showLoading(true);
        if (paginationControlsDiv) paginationControlsDiv.style.display = 'none';
        try {
            const users = await fetchWithAuth(`${API_BASE_URL}/users`);
            if (users) { // Verifica se a requisição foi bem sucedida (fetchWithAuth retorna null em falha de auth)
                users.sort((a, b) => formatDateForSort(b.last_seen_overall_at) - formatDateForSort(a.last_seen_overall_at));
                displayUserList(users);
            }
        } catch (error) {
            console.error('Erro ao buscar todos os usuários:', error);
            if (userListContainer) userListContainer.innerHTML = `<p class="error-message">Falha ao carregar usuários: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    function displayUserList(users) { /* Sua função displayUserList existente */
        if (!userListContainer) { console.error("userListContainer não encontrado!"); return; }
        userListContainer.innerHTML = '';
        if (!users || users.length === 0) {
            userListContainer.innerHTML = '<p class="placeholder-text">Nenhum usuário rastreado.</p>';
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
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    } else { alert("ID de usuário inválido."); }
                });
            }
            ul.appendChild(li);
        });
        userListContainer.appendChild(ul);
    }

    async function fetchAndDisplayUser(userId, filterToShow = 'summary') { /* Adaptada para fetchWithAuth */
        if (!getToken()) {
            alert("Por favor, faça login para ver os detalhes do usuário.");
            return;
        }
        if (!userId) { userContentArea.innerHTML = '<p class="error-message">ID inválido.</p>'; return; }
        showLoading(true); currentUserData = null;
        try {
            const user = await fetchWithAuth(`${API_BASE_URL}/users/${userId}`);
            if (user) {
                currentUserData = user;
                currentFilter = filterToShow;
                updateActiveFilterButtonDashboard();
                renderFilteredContent();
            } else {
                 userContentArea.innerHTML = `<p class="error-message">Usuário ID ${escapeHTML(userId)} não encontrado ou falha na autenticação.</p>`;
            }
        } catch (error) {
            console.error(`Erro ao buscar usuário ${userId}:`, error);
            userContentArea.innerHTML = `<p class="error-message">Falha ao carregar: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }
    
    function updateActiveFilterButtonDashboard() { // Renomeada para evitar conflito se houver outra função com mesmo nome
        filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.filter === currentFilter));
    }

    function renderFilteredContent() { /* Sua função renderFilteredContent existente, mas agora pode depender de currentUserData */
        if (!userContentArea) return;
        userContentArea.innerHTML = ''; 
        if (!loggedInUserInfo) { // Adiciona verificação se está logado
            userContentArea.innerHTML = `<p class="placeholder-text">Por favor, <a href="#" id="renderContentLoginLink">faça login</a> para ver o conteúdo.</p>`;
            const renderContentLoginLink = document.getElementById('renderContentLoginLink');
            if(renderContentLoginLink && dashboardLoginBtn) renderContentLoginLink.onclick = () => dashboardLoginBtn.click();
            return;
        }
        if (!currentUserData) {
            userContentArea.innerHTML = `<p class="placeholder-text"><i class="fas fa-user-slash"></i> Nenhum usuário do tracker selecionado.</p>`;
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
            case 'admin_panel': // Placeholder para o futuro painel admin
                if (loggedInUserInfo && loggedInUserInfo.role === 'admin') {
                    contentHTML = renderAdminPanelView(currentUserData); // Você precisará criar esta função
                } else {
                    contentHTML = '<p class="error-message">Acesso negado ao painel admin.</p>';
                }
                break;
            default: contentHTML = '<p class="error-message">Filtro desconhecido.</p>';
        }
        userContentArea.innerHTML = contentHTML;
    }

    // SUAS FUNÇÕES DE RENDERIZAÇÃO (renderSummaryView, renderAvatarsView, etc.) FICAM AQUI
    // Cole-as da sua versão anterior do dashboard.js, elas não precisam de grandes mudanças agora,
    // exceto que renderMessageImagesGalleryView já foi atualizada para usar message_image_history
    // e para o estilo da galeria de avatares.

    function renderSummaryView(user) { /* Cole sua função daqui */ 
        const latestAvatar = user.current_avatar_url || (user.avatar_url_history && user.avatar_url_history.length > 0 ? user.avatar_url_history[user.avatar_url_history.length - 1] : 'https://via.placeholder.com/128?text=?');
        const latestBanner = (user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls[user.banner_urls.length - 1] : '';
        const avatarCount = user.avatar_url_history ? user.avatar_url_history.length : 0;
        const bannerCount = user.banner_urls ? user.banner_urls.length : 0;
        const messageImageCount = user.message_image_history ? user.message_image_history.length : 0;
        const nicknameCount = user.username_global_history ? new Set(user.username_global_history.filter(n => n)).size : 0;  
        const serverCount = user.servers ? user.servers.length : 0;
        const historyLogCount = user.history ? user.history.length : 0;
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
                        <p>ID (Tracker): ${escapeHTML(userIdForDisplay)}</p>
                    </div>
                </div>
            </div>
            <div class="profile-section quick-stats">
                <div class="widget"><h3><i class="fas fa-user-edit"></i> Nomes Globais</h3><p>${nicknameCount}</p></div>
                <div class="widget"><h3><i class="fas fa-image"></i> Avatares</h3><p>${avatarCount}</p></div>
                <div class="widget"><h3><i class="fas fa-images"></i> Banners</h3><p>${bannerCount}</p></div>
                <div class="widget"><h3><i class="fas fa-server"></i> Servidores</h3><p>${serverCount}</p></div>
                <div class="widget"><h3><i class="fas fa-photo-film"></i> Imgs. Msg</h3><p>${messageImageCount}</p></div>
                <div class="widget"><h3><i class="fas fa-comments"></i> Msgs. Recentes</h3><p>${recentMessageCount}</p></div>
                <div class="widget"><h3><i class="fas fa-history"></i> Logs Hist. (DB)</h3><p>${historyLogCount}</p></div>
            </div>
            <div class="profile-section">
                <h3><i class="fas fa-info-circle"></i> Informações Gerais (Tracker)</h3>
                <ul class="profile-list">
                    <li><strong>Primeira vez Visto:</strong> ${formatDate(user.first_seen_overall_at)}</li>
                    <li><strong>Última Atividade:</strong> ${formatDate(user.last_seen_overall_at)}</li>
                </ul>
            </div>`;
    }
    function renderAvatarsView(user) { /* Cole sua função daqui */
        let html = '<div class="profile-section"><h3><i class="fas fa-image"></i> Galeria de Avatares</h3>';
        if (user.avatar_url_history && user.avatar_url_history.length > 0) {
            html += '<div class="avatar-gallery">';
            user.avatar_url_history.slice().reverse().forEach(url => {
                html += `<img src="${escapeHTML(url)}" alt="Avatar Histórico" class="history-avatar" onclick="window.open('${escapeHTML(url)}', '_blank')" title="Clique para abrir em nova aba">`;
            });
            html += '</div>';
        } else { html += '<p class="placeholder-text">Nenhum avatar histórico.</p>';}
        html += '</div>'; return html;
    }
    function renderBannersView(user) { /* Cole sua função daqui */
        let html = '<div class="profile-section"><h3><i class="fas fa-images"></i> Galeria de Banners</h3>';
        if (user.banner_urls && user.banner_urls.length > 0) {
            html += '<div class="banner-gallery">';
            user.banner_urls.slice().reverse().forEach(url => {
                html += `<img src="${escapeHTML(url)}" alt="Banner Histórico" class="history-banner-item" onclick="window.open('${escapeHTML(url)}', '_blank')" title="Clique para abrir em nova aba">`;
            });
            html += '</div>';
        } else { html += '<p class="placeholder-text">Nenhum banner histórico.</p>';}
        html += '</div>'; return html;
    }
    function renderMessageImagesGalleryView(user) { /* Função já atualizada na resposta anterior, cole aqui */
        let html = `<div class="profile-section"><h3><i class="fas fa-photo-film"></i> Galeria de Imagens das Mensagens (Todas)</h3>`;
        const allMessageImages = user.message_image_history || [];
        if (allMessageImages.length > 0) {
            const sortedImages = [...allMessageImages].sort((a, b) => formatDateForSort(b.timestamp) - formatDateForSort(a.timestamp));
            html += '<div class="avatar-gallery">'; // Reutiliza classe para estilo similar
            sortedImages.forEach(imgData => {
                const titleText = `Servidor: ${escapeHTML(imgData.guild_name || 'N/A')}\nData: ${formatDate(imgData.timestamp)}\nID Mensagem: ${escapeHTML(imgData.message_id || 'N/A')}${imgData.content_snippet ? `\nTexto: ${escapeHTML(imgData.content_snippet)}` : ''}`;
                html += `<img src="${escapeHTML(imgData.url)}" alt="Imagem da Mensagem (ID: ${escapeHTML(imgData.message_id || 'N/A')})" class="history-avatar" onclick="window.open('${escapeHTML(imgData.url)}', '_blank')" title="${escapeHTML(titleText)}">`;
            });
            html += '</div>';
        } else { html += '<p class="placeholder-text">Nenhuma imagem de mensagem encontrada no histórico.</p>';}
        html += '</div>'; return html;
    }
    function renderNicknamesView(user) { /* Cole sua função daqui */
        let html = '<div class="profile-section"><h3><i class="fas fa-signature"></i> Histórico de Nomes Globais</h3>';
        if (user.username_global_history && user.username_global_history.length > 0) {
            html += '<ul class="profile-list">';
            const uniqueNames = [...new Set(user.username_global_history)].reverse();
            uniqueNames.forEach(name => { html += `<li><strong>${escapeHTML(name) || 'N/A'}</strong></li>`;});
            html += '</ul>';
        } else { html += '<p class="placeholder-text">Nenhum nome global histórico.</p>';}
        html += '</div>'; return html;
    }
    function renderServersView(user) { /* Cole sua função daqui */
        let html = '<div class="profile-section"><h3><i class="fas fa-server"></i> Servidores Encontrados</h3>';
        if (user.servers && user.servers.length > 0) {
            html += '<ul class="profile-list">';
            const sortedServers = user.servers.slice().sort((a,b) => formatDateForSort(b.last_message_at || b.first_message_at) - formatDateForSort(a.last_message_at || a.first_message_at));
            sortedServers.forEach(server => {
                html += `<li><strong>${escapeHTML(server.guild_name) || 'Nome Desconhecido'}</strong> (ID: ${escapeHTML(server.guild_id)})<br><small>Primeira msg: ${formatDate(server.first_message_at)}</small><br><small>Última msg: ${formatDate(server.last_message_at)}</small></li>`;
            });
            html += '</ul>';
        } else { html += '<p class="placeholder-text">Nenhum servidor registrado.</p>';}
        html += '</div>'; return html;
    }
    function renderMessagesView(user) { /* Cole sua função daqui */
        let html = '<div class="profile-section"><h3><i class="fas fa-comments"></i> Mensagens Recentes (Últimas 10)</h3>';
        if (user.recent_messages && user.recent_messages.length > 0) {
            html += '<ul class="profile-list messages-list">';
            user.recent_messages.slice().reverse().forEach(msg => {
                html += `<li class="message-item"><div class="message-header"><strong>${escapeHTML(msg.guild_name) || 'Servidor Desconhecido'}</strong><span class="message-timestamp">${formatDate(msg.timestamp)}</span></div><div class="message-content">${msg.content ? `<p class="message-text">${escapeHTML(msg.content)}</p>` : '<p class="message-text placeholder-text"><em>(Sem texto)</em></p>'}${msg.image_url ? `<a href="${msg.image_url}" target="_blank" rel="noopener noreferrer" class="message-image-link"><img src="${msg.image_url}" alt="Imagem" class="message-image"></a>` : ''}</div><div class="message-footer"><small>ID Msg: ${escapeHTML(msg.message_id) || 'N/A'}</small></div></li>`;
            });
            html += '</ul>';
        } else { html += '<p class="placeholder-text">Nenhuma mensagem recente.</p>';}
        html += '</div>'; return html;
    }
    function renderFullHistoryView(user) { /* Cole sua função daqui */
        let html = '<div class="profile-section"><h3><i class="fas fa-history"></i> Histórico Detalhado de Alterações (DB)</h3>';
        if (user.history && user.history.length > 0) {
            html += '<ul class="profile-history-log profile-list">';
            user.history.slice().reverse().forEach(entry => {
                html += `<li><strong>Alterado em:</strong> ${formatDate(entry.changed_at)}<pre>${escapeHTML(JSON.stringify(entry.changes, null, 2))}</pre></li>`;
            });
            html += '</ul>';
        } else { html += '<p class="placeholder-text">Nenhum histórico de alterações (DB).</p>';}
        html += '</div>'; return html;
    }
    function renderAdminPanelView(user) { // Função placeholder para o painel admin
        return `<div class="profile-section"><h3><i class="fas fa-user-shield"></i> Painel Administrativo</h3><p>Bem-vindo ao Painel Admin, ${escapeHTML(loggedInUserInfo.username)}!</p><p>Funcionalidades de filtro de usuários (ex: por imagens salvas) serão implementadas aqui.</p></div>`;
    }


    // Event Listeners
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (!loggedInUserInfo) { // Se não estiver logado, não permite mudar filtro, exceto se for o botão admin
                alert("Por favor, faça login para usar os filtros.");
                return;
            }
            currentFilter = button.dataset.filter;
            updateActiveFilterButtonDashboard();
            renderFilteredContent();
        });
    });
    if (adminPanelBtn) {
        adminPanelBtn.addEventListener('click', () => {
            if (loggedInUserInfo && loggedInUserInfo.role === 'admin') {
                currentFilter = adminPanelBtn.dataset.filter;
                updateActiveFilterButtonDashboard(); // Atualiza botão ativo na sidebar
                filterButtons.forEach(btn => btn.classList.remove('active')); // Remove active de outros botões
                adminPanelBtn.classList.add('active'); // Ativa o botão admin
                renderFilteredContent();
            } else {
                alert("Acesso negado.");
            }
        });
    }


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
    
    // Inicialização da página
    handlePageLoadAuth();
    // renderFilteredContent(); // Chamado dentro de handlePageLoadAuth se logado, ou setLoggedOutUI
    updateActiveFilterButtonDashboard(); 
});
