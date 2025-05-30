document.addEventListener('DOMContentLoaded', () => {
    // IMPORTANTE: Substitua pela URL da sua API no Render
    const API_BASE_URL = 'https://celestial-api.onrender.com'; // Ex: 'https://celestial-tracker-api.onrender.com'

    // Elementos do DOM
    const userListContainer = document.getElementById('userListContainer');
    const userDetailsContainer = document.getElementById('userDetailsContainer');
    const searchUserIdInput = document.getElementById('searchUserIdInput');
    const searchUserBtn = document.getElementById('searchUserBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const currentPageSpan = document.getElementById('currentPageSpan');

    let currentPage = 0;
    const usersPerPage = 10; // Corresponde ao 'limit' padrão na API

    function showLoading(show = true) {
        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'block' : 'none';
        }
    }

    // Função para formatar datas (MongoDB/JSON)
    function formatDate(dateStringOrObject) {
        if (!dateStringOrObject) return 'N/A';
        // A API (com bson.json_util) pode retornar datas como:
        // 1. {"$date": "YYYY-MM-DDTHH:mm:ss.sssZ"} (string ISO)
        // 2. {"$date": 1622505600000} (timestamp em milissegundos)
        // 3. Ou, se a serialização for diferente, pode ser uma string ISO direta.
        let date;
        if (typeof dateStringOrObject === 'object' && dateStringOrObject !== null && '$date' in dateStringOrObject) {
            date = new Date(dateStringOrObject.$date);
        } else {
            date = new Date(dateStringOrObject);
        }
        return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    }


    // Função para buscar todos os usuários (ou uma página de usuários)
    async function fetchAllUsers(page = 0) {
        showLoading(true);
        const skip = page * usersPerPage;
        try {
            const response = await fetch(`${API_BASE_URL}/users/?skip=${skip}&limit=${usersPerPage}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(`HTTP error! status: ${response.status}, Message: ${errorData.detail || response.statusText}`);
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

    // Função para exibir uma lista de usuários
    function displayUserList(users) {
        if (!userListContainer) return;
        userListContainer.innerHTML = ''; // Limpa lista anterior

        if (!users || users.length === 0) {
            userListContainer.innerHTML = '<p>Nenhum usuário encontrado.</p>';
            if (nextPageBtn) nextPageBtn.disabled = true; // Desabilita se não houver mais usuários
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'user-list'; // Adicione estilos para .user-list e .user-list-item no seu CSS
        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'user-list-item';
            const latestAvatar = (user.avatar_urls && user.avatar_urls.length > 0) ? user.avatar_urls[user.avatar_urls.length - 1] : 'https://via.placeholder.com/40?text=?'; // Placeholder

            li.innerHTML = `
                <img src="${latestAvatar}" alt="Avatar de ${user.username_global || 'Usuário'}" class="user-avatar-small">
                <span class="user-name">${user.username_global || 'Nome Desconhecido'} (ID: ${user.user_id})</span>
                <button class="view-details-btn" data-userid="${user.user_id}">Ver Detalhes</button>
            `;
            ul.appendChild(li);
        });
        userListContainer.appendChild(ul);

        // Adiciona event listeners para os botões "Ver Detalhes"
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const userId = event.target.dataset.userid;
                fetchUserDetails(userId);
                window.scrollTo({ top: userDetailsContainer.offsetTop - 20, behavior: 'smooth' }); // Rola para a seção de detalhes
            });
        });
    }

    // Função para buscar detalhes de um usuário específico
    async function fetchUserDetails(userId) {
        if (!userId) {
            if (userDetailsContainer) userDetailsContainer.innerHTML = '<p class="error-message">Por favor, forneça um ID de usuário.</p>';
            return;
        }
        showLoading(true);
        if (userDetailsContainer) userDetailsContainer.innerHTML = 'Carregando detalhes do usuário...';

        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: response.statusText }));
                if (response.status === 404) {
                    if (userDetailsContainer) userDetailsContainer.innerHTML = `<p>Usuário com ID ${userId} não encontrado.</p>`;
                } else {
                    throw new Error(`HTTP error! status: ${response.status}, Message: ${errorData.detail || response.statusText}`);
                }
                return;
            }
            const user = await response.json();
            displayUserDetails(user);
        } catch (error) {
            console.error(`Erro ao buscar detalhes do usuário ${userId}:`, error);
            if (userDetailsContainer) userDetailsContainer.innerHTML = `<p class="error-message">Falha ao carregar detalhes do usuário: ${error.message}</p>`;
        } finally {
            showLoading(false);
        }
    }

    // Função para exibir os detalhes do usuário
    function displayUserDetails(user) {
        if (!userDetailsContainer) return;
        userDetailsContainer.innerHTML = ''; // Limpa conteúdo anterior

        if (!user) {
            userDetailsContainer.innerHTML = '<p>Nenhum dado de usuário para exibir.</p>';
            return;
        }

        const latestAvatar = (user.avatar_urls && user.avatar_urls.length > 0) ? user.avatar_urls[user.avatar_urls.length - 1] : 'https://via.placeholder.com/128?text=?';
        const latestBanner = (user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls[user.banner_urls.length - 1] : '';

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'user-profile-card'; // Crie estilos para esta classe

        detailsDiv.innerHTML = `
            ${latestBanner ? `<div class="profile-banner" style="background-image: url('${latestBanner}');"></div>` : '<div class="profile-banner-placeholder"><span>Sem Banner</span></div>'}
            <div class="profile-header">
                <img src="${latestAvatar}" alt="Avatar de ${user.username_global}" class="profile-avatar-large">
                <h2 class="profile-username">${user.username_global || 'N/A'}</h2>
                <p class="profile-userid">ID: ${user.user_id}</p>
                ${user.nick ? `<p class="profile-nick">Apelido Atual (Servidor): ${user.nick}</p>` : ''}
            </div>

            <div class="profile-section">
                <h3>Apelidos Conhecidos:</h3>
                <ul class="profile-list">
                    ${(user.nicknames && user.nicknames.length > 0) ? user.nicknames.map(nick => `<li>${nick || 'N/A'}</li>`).join('') : '<li>Nenhum apelido registrado.</li>'}
                </ul>
            </div>

            <div class="profile-section">
                <h3>Servidores em Comum (rastreados):</h3>
                <ul class="profile-list">
                    ${(user.servers && user.servers.length > 0) ? user.servers.map(server => `<li>${server.guild_name} (ID: ${server.guild_id}) - Visto pela primeira vez em: ${formatDate(server.first_seen)}</li>`).join('') : '<li>Nenhum servidor registrado.</li>'}
                </ul>
            </div>

            <div class="profile-section">
                <h3>Histórico de Avatares:</h3>
                <div class="avatar-gallery">
                    ${(user.avatar_urls && user.avatar_urls.length > 0) ? user.avatar_urls.slice().reverse().map(url => `<img src="${url}" alt="avatar antigo" class="history-avatar">`).join('') : '<p>Nenhum histórico de avatar.</p>'}
                </div>
            </div>

            <div class="profile-section">
                <h3>Histórico de Banners:</h3>
                <div class="banner-gallery">
                    ${(user.banner_urls && user.banner_urls.length > 0) ? user.banner_urls.slice().reverse().map(url => `<img src="${url}" alt="banner antigo" class="history-banner">`).join('') : '<p>Nenhum histórico de banner.</p>'}
                </div>
            </div>

            <div class="profile-section">
                <h3>Registro Completo de Alterações:</h3>
                <ul class="profile-history-log">
                    ${(user.history && user.history.length > 0) ? user.history.slice().reverse().map(entry => `
                        <li>
                            <strong>Alterado em:</strong> ${formatDate(entry.changed_at)}
                            <pre>${JSON.stringify(entry.changes, null, 2)}</pre>
                        </li>`).join('') : '<li>Nenhum histórico de alterações.</li>'}
                </ul>
            </div>
        `;
        userDetailsContainer.appendChild(detailsDiv);
    }

    // Event Listeners Iniciais
    if (searchUserBtn && searchUserIdInput) {
        searchUserBtn.addEventListener('click', () => {
            const userIdToSearch = searchUserIdInput.value.trim();
            fetchUserDetails(userIdToSearch);
        });
        searchUserIdInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                const userIdToSearch = searchUserIdInput.value.trim();
                fetchUserDetails(userIdToSearch);
            }
        });
    }

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 0) {
                fetchAllUsers(currentPage - 1);
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', () => {
            fetchAllUsers(currentPage + 1);
        });
    }

    // Carrega a lista inicial de usuários quando a página é carregada
    fetchAllUsers(0);
});