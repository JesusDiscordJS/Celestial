document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'https://celestial-api.onrender.com';
    const FRONTEND_LOGIN_URL = 'https://jesusdiscordjs.github.io/Celestial/';

    // Elementos comuns da Dashboard
    const usernameElement = document.getElementById('username');
    const userAvatarElement = document.getElementById('userAvatar');
    const logoutButton = document.getElementById('logoutButton');

    // Elementos da Seção de Rastrear Usuário Individual
    const discordUserIdInput = document.getElementById('discordUserId');
    const trackUserButton = document.getElementById('trackUserButton');
    const singleTrackerResultsArea = document.getElementById('singleTrackerResultsArea');
    const trackerResultsContentElement = document.getElementById('trackerResultsContent'); // Renomeado de trackerResults
    const trackedUserIdElement = document.getElementById('trackedUserId');
    const trackerErrorMessageElement = document.getElementById('trackerErrorMessage');

    // Elementos da Seção de Amigos
    const friendsSectionButton = document.getElementById('friendsSectionButton'); // Botão para mostrar seção de amigos
    const friendsTrackerResultsElement = document.getElementById('friendsTrackerResults');
    const friendsInfoMessageElement = document.getElementById('friendsInfoMessage');
    const friendsErrorMessageElement = document.getElementById('friendsErrorMessage');

    // Elementos de navegação entre seções
    const trackUserSectionButton = document.getElementById('trackUserSectionButton');
    const trackerSectionElement = document.getElementById('trackerSection');
    const friendsSectionElement = document.getElementById('friendsSection');


    const fetchWithCredentials = async (url, options = {}) => {
        return fetch(url, {
            ...options,
            credentials: 'include'
        });
    };

    // Função para exibir dados do tracker (reutilizável)
    const displayTrackerData = (data, targetElement) => {
        let resultsHTML = `
            <p><strong>ID do Usuário:</strong> ${data.userId}</p>
            <p><strong>Nomes de Usuário Registrados:</strong></p>
            <ul>${data.usernames && data.usernames.length > 0 ? data.usernames.map(name => `<li>${name}</li>`).join('') : '<li>Nenhum nome registrado.</li>'}</ul>
            <p><strong>Avatares Registrados:</strong></p>
            <ul class="avatar-list">`; // Adicionada classe para possível estilização

        if (data.avatars && data.avatars.length > 0) {
            data.avatars.forEach(avatarUrl => {
                resultsHTML += `<li><img src="${avatarUrl}" alt="Avatar" loading="lazy"></li>`; // lazy loading
            });
        } else {
            resultsHTML += '<li>Nenhum avatar registrado.</li>';
        }
        resultsHTML += '</ul>';

        if (data.lastJoinCall && data.lastJoinCall.timestamp) {
            resultsHTML += `<p><strong>Última Entrada em Chamada:</strong> Canal ID ${data.lastJoinCall.channelId} em ${new Date(data.lastJoinCall.timestamp).toLocaleString('pt-BR')}</p>`;
        } else {
            resultsHTML += `<p><strong>Última Entrada em Chamada:</strong> Não registrado.</p>`;
        }
        if (data.lastLeaveCall && data.lastLeaveCall.timestamp) {
            resultsHTML += `<p><strong>Última Saída de Chamada:</strong> Canal ID ${data.lastLeaveCall.channelId} em ${new Date(data.lastLeaveCall.timestamp).toLocaleString('pt-BR')}</p>`;
        } else {
            resultsHTML += `<p><strong>Última Saída de Chamada:</strong> Não registrado.</p>`;
        }
        resultsHTML += `<p><strong>Criado em:</strong> ${new Date(data.createdAt).toLocaleString('pt-BR')}</p>`;
        resultsHTML += `<p><strong>Atualizado em:</strong> ${new Date(data.updatedAt).toLocaleString('pt-BR')}</p>`;
        
        targetElement.innerHTML = resultsHTML;
    };


    if (document.getElementById('loginButton')) {
        // --- LÓGICA DA PÁGINA DE LOGIN (index.html) ---
        // (código da página de login permanece o mesmo)
        const loginButton = document.getElementById('loginButton');
        const errorMessageElement = document.getElementById('errorMessage');
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('error') && urlParams.get('error') === 'auth_failed') {
            if (errorMessageElement) errorMessageElement.textContent = 'Falha na autenticação com o Discord. Tente novamente.';
        }
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                window.location.href = `${API_BASE_URL}/auth/discord`;
            });
        }

    } else if (document.querySelector('.dashboard-container')) {
        // --- LÓGICA DA PÁGINA DE DASHBOARD (dashboard.html) ---
        
        // Navegação de seções
        if (trackUserSectionButton && friendsSectionButton && trackerSectionElement && friendsSectionElement) {
            trackUserSectionButton.addEventListener('click', () => {
                trackerSectionElement.classList.add('active-section');
                friendsSectionElement.classList.remove('active-section');
                trackUserSectionButton.classList.add('active');
                friendsSectionButton.classList.remove('active');
            });
            friendsSectionButton.addEventListener('click', () => {
                friendsSectionElement.classList.add('active-section');
                trackerSectionElement.classList.remove('active-section');
                friendsSectionButton.classList.add('active');
                trackUserSectionButton.classList.remove('active');
                // Carregar amigos ao clicar na aba, se ainda não carregados
                if (friendsTrackerResultsElement.innerHTML.trim() === '' && !friendsInfoMessageElement.textContent.startsWith('Carregando')) {
                    loadFriendsData();
                }
            });
        }


        const checkAuthStatus = async () => {
            try {
                const response = await fetchWithCredentials(`${API_BASE_URL}/api/me`);
                if (!response.ok) {
                    if (response.status === 401) {
                        window.location.href = FRONTEND_LOGIN_URL;
                        return;
                    }
                    throw new Error(`Erro ao buscar dados do usuário: ${response.statusText}`);
                }
                const userData = await response.json();
                if (usernameElement) usernameElement.textContent = userData.username;
                if (userAvatarElement && userData.avatar) {
                    const avatarExtension = userData.avatar.startsWith('a_') ? 'gif' : 'png';
                    userAvatarElement.src = `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${avatarExtension}?size=128`;
                } else if (userAvatarElement) {
                    userAvatarElement.src = 'https://via.placeholder.com/50/7289da/ffffff?text=N/A';
                }
            } catch (error) {
                console.error('Erro de autenticação:', error);
                if (usernameElement) usernameElement.textContent = 'Erro';
                // Poderia redirecionar para login em outros erros também
                // window.location.href = FRONTEND_LOGIN_URL;
            }
        };

        if (logoutButton) {
            logoutButton.addEventListener('click', async () => {
                try {
                    const response = await fetchWithCredentials(`${API_BASE_URL}/auth/logout`);
                    const data = await response.json();
                    if (response.ok && data.redirectTo) {
                        window.location.href = data.redirectTo;
                    } else {
                        console.error('Erro no logout:', data.message || 'Erro desconhecido');
                        alert('Erro ao fazer logout. Tente novamente.');
                    }
                } catch (error) {
                    console.error('Erro ao fazer logout:', error);
                    alert('Erro de rede ao tentar fazer logout.');
                }
            });
        }

        if (trackUserButton && discordUserIdInput) {
            trackUserButton.addEventListener('click', async () => {
                const userIdToTrack = discordUserIdInput.value.trim();
                trackerErrorMessageElement.textContent = '';
                if (!userIdToTrack) {
                    trackerErrorMessageElement.textContent = 'Por favor, insira um ID de usuário do Discord.';
                    return;
                }
                if (!/^\d{17,19}$/.test(userIdToTrack)) {
                    trackerErrorMessageElement.textContent = 'Formato de ID inválido.';
                    return;
                }

                singleTrackerResultsArea.style.display = 'none';
                trackerResultsContentElement.innerHTML = '<p>Carregando...</p>';
                singleTrackerResultsArea.style.display = 'block'; // Mostra a área de resultados
                trackedUserIdElement.textContent = userIdToTrack;


                try {
                    const response = await fetchWithCredentials(`${API_BASE_URL}/api/avatars/${userIdToTrack}`);
                    const data = await response.json();
                    if (!response.ok) {
                        trackerErrorMessageElement.textContent = data.error || `Erro ${response.status}: Falha ao buscar dados.`;
                        trackerResultsContentElement.innerHTML = ''; // Limpa o carregando
                        return;
                    }
                    displayTrackerData(data, trackerResultsContentElement);
                } catch (error) {
                    console.error('Erro ao rastrear usuário:', error);
                    trackerErrorMessageElement.textContent = 'Erro de rede ou API indisponível.';
                    trackerResultsContentElement.innerHTML = ''; // Limpa o carregando
                }
            });
        }

        // --- LÓGICA PARA A SEÇÃO DE AMIGOS ---
        const loadFriendsData = async () => {
            friendsInfoMessageElement.textContent = 'Carregando lista de amigos...';
            friendsErrorMessageElement.textContent = '';
            friendsTrackerResultsElement.innerHTML = '';

            try {
                const friendsResponse = await fetchWithCredentials(`${API_BASE_URL}/api/me/friends`);
                if (!friendsResponse.ok) {
                    const errorData = await friendsResponse.json().catch(() => ({ error: friendsResponse.statusText }));
                    throw new Error(errorData.error || `Erro ao buscar lista de amigos: ${friendsResponse.status}`);
                }
                const friends = await friendsResponse.json();

                if (friends.length === 0) {
                    friendsInfoMessageElement.textContent = 'Nenhum amigo encontrado na sua lista do Discord ou permissão não concedida.';
                    return;
                }

                friendsInfoMessageElement.textContent = `Buscando dados para ${friends.length} amigo(s)...`;
                
                let friendsProcessed = 0;
                const totalFriends = friends.length;

                for (const friend of friends) {
                    const friendCard = document.createElement('div');
                    friendCard.classList.add('friend-card');
                    
                    let friendAvatarUrl = 'https://via.placeholder.com/50/40444B/FFFFFF?Text=??';
                    if(friend.avatar) {
                        const avatarExtension = friend.avatar.startsWith('a_') ? 'gif' : 'png';
                        friendAvatarUrl = `https://cdn.discordapp.com/avatars/${friend.id}/${friend.avatar}.${avatarExtension}?size=64`;
                    }

                    friendCard.innerHTML = `
                        <div class="friend-info">
                            <img src="${friendAvatarUrl}" alt="${friend.username}'s avatar" class="friend-avatar" loading="lazy">
                            <h4>${friend.username}#${friend.discriminator} (ID: ${friend.id})</h4>
                        </div>
                        <div class="friend-tracker-data loading">Carregando dados do tracker...</div>
                    `;
                    friendsTrackerResultsElement.appendChild(friendCard);

                    try {
                        const trackerResponse = await fetchWithCredentials(`${API_BASE_URL}/api/avatars/${friend.id}`);
                        const trackerData = await trackerResponse.json();
                        const trackerDataElement = friendCard.querySelector('.friend-tracker-data');
                        trackerDataElement.classList.remove('loading');

                        if (!trackerResponse.ok) {
                            trackerDataElement.innerHTML = `<p class="error-message">Erro: ${trackerData.error || 'Não foi possível buscar dados.'}</p>`;
                        } else {
                            displayTrackerData(trackerData, trackerDataElement);
                        }
                    } catch (trackerError) {
                        console.error(`Erro ao buscar tracker para amigo ${friend.id}:`, trackerError);
                        const trackerDataElement = friendCard.querySelector('.friend-tracker-data');
                        trackerDataElement.classList.remove('loading');
                        trackerDataElement.innerHTML = `<p class="error-message">Erro de rede ao buscar dados do tracker.</p>`;
                    }
                    friendsProcessed++;
                    friendsInfoMessageElement.textContent = `Buscando dados... ${friendsProcessed}/${totalFriends} amigos processados.`;
                }
                friendsInfoMessageElement.textContent = `Dados de ${totalFriends} amigo(s) carregados.`;
                if(totalFriends === 0) friendsInfoMessageElement.textContent = "Você não tem amigos para mostrar ou a API não pôde buscá-los.";


            } catch (error) {
                console.error('Erro ao carregar dados dos amigos:', error);
                friendsErrorMessageElement.textContent = error.message || 'Falha ao carregar dados dos amigos.';
                friendsInfoMessageElement.textContent = ''; // Limpa msg de carregando
            }
        };
        
        // Inicialmente, a seção de tracker individual está ativa
        trackerSectionElement.classList.add('active-section');
        trackUserSectionButton.classList.add('active');
        friendsSectionElement.classList.remove('active-section'); // Garante que a de amigos comece inativa


        checkAuthStatus(); // Chamar a verificação de autenticação ao carregar a dashboard
    }
});
